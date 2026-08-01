/**
 * Cloud Storage for user avatars (modular RN Firebase API). Native-only.
 */
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  putFile,
  ref,
} from '@react-native-firebase/storage';

const avatarRef = (uid: string) => ref(getStorage(), `avatars/${uid}.jpg`);

/** Upload a local image file as the user's avatar and return its download URL. */
export async function uploadAvatar(uid: string, localUri: string): Promise<string> {
  const reference = avatarRef(uid);
  await putFile(reference, localUri);
  return getDownloadURL(reference);
}

/** Delete the stored avatar. Succeeds quietly when there was never one. */
export async function deleteAvatar(uid: string): Promise<void> {
  try {
    await deleteObject(avatarRef(uid));
  } catch (e) {
    if (!hasCode(e, 'storage/object-not-found')) throw e;
  }
}

function hasCode(e: unknown, code: string): boolean {
  return !!e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === code;
}
