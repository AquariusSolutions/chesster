import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";

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
