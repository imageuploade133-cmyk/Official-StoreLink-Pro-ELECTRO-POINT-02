# Firebase Admin SDK Setup Guide

If you are seeing "Missing Server Credentials" or "auth_check_failed", follow these steps to properly set up your Firebase Admin SDK.

## Option 1: Environment Variable (Recommended for Vercel/Production)

1.  **Generate Service Account Key**:
    *   Go to [Firebase Console](https://console.firebase.google.com/).
    *   Navigate to **Project Settings** > **Service Accounts**.
    *   Click **Generate New Private Key**.
    *   Download the JSON file.

2.  **Add to Environment Variables**:
    *   In your hosting provider (e.g., Vercel), add a new environment variable named `FIREBASE_SERVICE_ACCOUNT_KEY`.
    *   **Value**: Paste the entire contents of the downloaded JSON file.
    *   *Note*: Our system automatically handles both raw JSON and Base64 encoded JSON. If you encounter issues with multiline strings, you can encode the JSON to Base64 and use that instead.

3.  **Project ID**:
    *   Ensure `FIREBASE_PROJECT_ID` is also set to your Firebase project ID (e.g., `valentino-ice-cream`).

## Option 2: Local File (Recommended for Development)

1.  **Save the Key File**:
    *   Rename your downloaded service account JSON file to `serviceAccountKey.json`.
    *   Place it in the root directory of this project.

2.  **Security**:
    *   The `.gitignore` file is already configured to ignore `serviceAccountKey.json`. **Never commit this file to your repository.**

## Troubleshooting

*   **Vercel Multiline Issues**: If the private key causes issues in Vercel, try encoding the entire JSON to Base64:
    ```bash
    cat serviceAccountKey.json | base64 | pbcopy
    ```
    Then paste the result into the `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable.
*   **Singleton Initialization**: The app is designed to initialize the Admin SDK only once. If you make changes to environment variables, you must restart your development server or redeploy your application.
*   **Permissions**: Ensure the service account has the "Editor" or "Firebase Admin" role in your Google Cloud project to allow access to Firestore and Auth.
