import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import vision from "@google-cloud/vision";

admin.initializeApp();

/**
 * When a user account is deleted, remove their Realtime Database data
 * (users/{uid} — settings, games and any match in progress) and their avatar
 * in Storage.
 *
 * Running this server-side guarantees cleanup even if the client is offline or
 * the delete was interrupted, so no client-side cleanup is needed.
 */
export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  const { uid } = user;

  // Removing the subtree takes settings, games and currentMatch with it.
  await admin.database().ref(`users/${uid}`).remove();

  // Remove the avatar if one was uploaded.
  try {
    await admin.storage().bucket().file(`avatars/${uid}.jpg`).delete();
  } catch (e) {
    functions.logger.info(`No avatar to delete for ${uid}`, e);
  }
});

// SafeSearch likelihoods, ordered so we can compare against a threshold.
const LIKELIHOOD = [
  "UNKNOWN",
  "VERY_UNLIKELY",
  "UNLIKELY",
  "POSSIBLE",
  "LIKELY",
  "VERY_LIKELY",
] as const;

const atLeast = (
  value: string | null | undefined,
  threshold: (typeof LIKELIHOOD)[number],
): boolean =>
  LIKELIHOOD.indexOf((value ?? "UNKNOWN") as (typeof LIKELIHOOD)[number]) >=
  LIKELIHOOD.indexOf(threshold);

const visionClient = new vision.ImageAnnotatorClient();

/**
 * Screen uploaded profile pictures for NSFW content. Triggered when an avatar
 * lands in Storage at `avatars/{uid}.jpg`, it runs Google Cloud Vision
 * SafeSearch and writes a verdict to `users/{uid}/avatarModeration`. Disallowed
 * images (adult / violent / racy) are deleted from Storage and rejected; the
 * client waits for this verdict before committing the photo to the profile, so
 * flagged content is never displayed or kept.
 *
 * Requires the Cloud Vision API to be enabled on the project (Blaze plan).
 */
export const moderateAvatar = functions.storage
  .object()
  .onFinalize(async (object) => {
    const name = object.name;
    if (!name || !name.startsWith("avatars/") || !name.endsWith(".jpg")) {
      return;
    }
    const uid = name.slice("avatars/".length, -".jpg".length);
    if (!uid) return;

    const bucket = admin.storage().bucket(object.bucket);
    const file = bucket.file(name);
    const modRef = admin.database().ref(`users/${uid}/avatarModeration`);

    try {
      const [result] = await visionClient.safeSearchDetection(
        `gs://${object.bucket}/${name}`,
      );
      const s = result.safeSearchAnnotation;

      const reasons: string[] = [];
      if (atLeast(s?.adult as string, "LIKELY")) reasons.push("adult");
      if (atLeast(s?.violence as string, "LIKELY")) reasons.push("violence");
      // Racy uses a stricter threshold to avoid false positives (e.g. swimwear).
      if (atLeast(s?.racy as string, "VERY_LIKELY")) reasons.push("racy");

      if (reasons.length > 0) {
        await file.delete().catch((e) =>
          functions.logger.warn(`Could not delete rejected avatar ${name}`, e),
        );
        await modRef.set({
          status: "rejected",
          reason: reasons.join(","),
          at: admin.database.ServerValue.TIMESTAMP,
        });
        functions.logger.info(`Rejected avatar for ${uid}: ${reasons.join(",")}`);
      } else {
        await modRef.set({
          status: "approved",
          at: admin.database.ServerValue.TIMESTAMP,
        });
      }
    } catch (e) {
      // Fail closed: if SafeSearch can't run, delete the upload and reject so
      // unscreened content is never kept. The client surfaces a retry message.
      functions.logger.error(`SafeSearch failed for ${name}`, e);
      await file.delete().catch(() => undefined);
      await modRef.set({
        status: "rejected",
        reason: "moderation-error",
        at: admin.database.ServerValue.TIMESTAMP,
      });
    }
  });
