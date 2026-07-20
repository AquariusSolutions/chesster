/**
 * Cloud Storage for user avatars (modular RN Firebase API). Native-only.
 */
import {
  getDownloadURL,
  getStorage,
  putFile,
  ref,
} from '@react-native-firebase/storage';

/** Upload a local image file as the user's avatar and return its download URL. */
export async function uploadAvatar(uid: string, localUri: string): Promise<string> {
  const reference = ref(getStorage(), `avatars/${uid}.jpg`);
  await putFile(reference, localUri);
  return getDownloadURL(reference);
}
