/**
 * Terms & Conditions versioning and metadata.
 *
 * The gate (see `components/terms-gate.tsx`) shows until the user has accepted
 * `TERMS_VERSION`. Bump this number whenever the terms change materially and
 * every user will be asked to accept again on their next launch.
 */
export const TERMS_VERSION = 1;

/** Human-readable effective date shown at the top of the terms. */
export const TERMS_EFFECTIVE_DATE = 'August 15, 2026';

/** Where users can reach you with questions about the terms. */
export const LEGAL_CONTACT_EMAIL = 'support@aquariussolutions.app';

/**
 * Optional: a canonical, hosted copy of the terms. When set, screens may link
 * out to it via expo-web-browser. Leave empty to rely on the bundled text only.
 */
export const TERMS_URL = '';
