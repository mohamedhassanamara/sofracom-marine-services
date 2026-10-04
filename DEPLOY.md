# Deploying accounts, reviews and the staff-app enrolment

Production rollout of the `with-users` branch (website) and the enrolment version of the staff app
(`sofracom_admin_pp`). Follow the steps **in order**; each has a check and a rollback. Nothing in
this file has been run against production.

- Firebase project: `sofracom` (alias `prod` in `.firebaserc`). The default project is the
  `demo-sofracom` emulator project, so **every production `firebase`/`gcloud`/`gsutil` command
  below names the project explicitly (`--project sofracom`)**. Never rely on
  `gcloud config set project` or `firebase use`.
- Node scripts (`set-admin-claim`, `migrate-statuses`) pick the project from the service-account
  credentials and print `PRODUCTION` or `EMULATOR` before doing anything; check that line.
- Tools: firebase-tools (needs Java 21+), `gcloud`, Flutter, `git-filter-repo` (last section).
- Website: `https://sofracom-marine-services.vercel.app`.

---

## 1. Confirm the leaked key is rotated

The old service-account key (`94ea761c…`, `firebase-adminsdk-fbsvc@sofracom.iam.gserviceaccount.com`)
shipped inside the staff APK and the app's git history. Until it is deleted, anyone holding it has
full admin access and every security rule below is meaningless.

1. Google Cloud console → IAM & Admin → Service accounts → `firebase-adminsdk-fbsvc` → Keys →
   **Add key → JSON**. Then **delete key `94ea761c…`**.
2. Vercel → Project → Settings → Environment Variables (Production and Preview): set
   `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` from the new JSON
   (or `FIREBASE_SERVICE_ACCOUNT_BASE64`). Remove any variable still holding the old key.
3. Local machines: replace the git-ignored `*firebase-adminsdk*.json` in the website repo with the
   new file, and **delete** the old copy from the app folder
   (`sofracom_admin_pp/sofracom-firebase-adminsdk-fbsvc-94ea761cbb.json`).

**Check:**
```bash
gcloud iam service-accounts keys list \
  --iam-account=firebase-adminsdk-fbsvc@sofracom.iam.gserviceaccount.com --project sofracom
# 94ea761c… must NOT be listed (only the new key + Google-managed keys).
```
**Rollback:** none needed; the old key must stay deleted.

Unrelated but found during the review: the local Flutter SDK's git remote
(`~/develop/flutter`) embeds a GitHub personal access token. Revoke it on GitHub
(Settings → Developer settings → Personal access tokens) and reset the remote:
`git -C ~/develop/flutter remote set-url origin https://github.com/flutter/flutter.git`.

### One-time console setup (before step 2)
- Authentication → Sign-in method: enable **Email/Password** and **Google**.
- Authentication → Settings → Authorized domains: add `sofracom-marine-services.vercel.app`
  (and any custom/preview domain the site is served from).
- Vercel env (Production + Preview): `NEXT_PUBLIC_FIREBASE_API_KEY`,
  `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` (`sofracom.firebaseapp.com`),
  `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (`sofracom`), optionally `NEXT_PUBLIC_FIREBASE_APP_ID`
  (Project settings → Your apps → Web app). **Do not** set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS`
  or any `*_EMULATOR_HOST` in Vercel.
- Project settings → Your apps → **Add app → Android**, package name **`com.sofracom.admin`**.
  Download its `google-services.json` (needed in step 3).

---

## 2. Deploy the website

Merge `with-users` into `main` (or promote the branch's Vercel preview) and let Vercel deploy.

**Keep the gap between this step and step 3 short (ideally the same day).** In between, the old
app is still installed and the old rules are still open, so it keeps working, but:
- new orders arrive as `pending` / quotes as `received` and show as grey raw text in the old app;
- the old app can only set legacy statuses. An order it marks **"Treated"** shows as *delivered*
  on the website but does **not** unlock reviews (eligibility needs the exact value `delivered`).
  Step 8's migration converts `treated → delivered`, which fixes them. To unlock reviews before
  that, open `/admin` → Orders, filter **Delivered**, and for each order marked from the old app
  choose **Delivered** with a short note (e.g. "confirmed") and press Update. The note is
  required because the status already *displays* as delivered.

Make the staff website accounts admins (each person first signs up on the site):
```bash
# website repo, with the NEW key in place (step 1); prints "on PRODUCTION"
node scripts/set-admin-claim.js staff@yourdomain.tn
```

**Check:**
- Place a small guest order on the live site; it appears in the old app (as `pending`).
- Sign up / sign in works, `/account` loads, `/admin` opens for a staff account (sign out and
  back in after setting the claim).
- Vercel logs show no `Missing Firebase credentials` errors.

**Rollback:** Vercel → Deployments → previous production deployment → **Instant Rollback**.
Orders created meanwhile keep their new-style fields; the old site ignores them.

---

## 3. Build and distribute the new staff APK

### 3a. Firebase config for the new application id
Put the `google-services.json` downloaded for `com.sofracom.admin` (one-time setup above) at
`sofracom_admin_pp/android/app/google-services.json`, replacing the old one, and commit it (this
file is not secret). Builds fail with *"No matching client found for package name"* until this
is done.

### 3b. Release keystore (once; keep it forever)
The app was signed with the debug key and used `com.example.sofracom_admin_app`. From now on it is
`com.sofracom.admin`, signed with your own upload key. **Losing this keystore means every phone has
to uninstall, reinstall and re-enrol to get updates**, so back it up (password manager + offline).

```bash
keytool -genkey -v \
  -keystore ~/keys/sofracom-admin-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias sofracom-admin
```

Create `sofracom_admin_pp/android/key.properties` (git-ignored, as is `*.jks`):
```properties
storePassword=<keystore password>
keyPassword=<key password>
keyAlias=sofracom-admin
storeFile=/Users/<you>/keys/sofracom-admin-upload.jks
```

### 3c. Build
```bash
cd sofracom_admin_pp
flutter pub get
flutter test
flutter build apk --release \
  --dart-define=API_BASE_URL=https://sofracom-marine-services.vercel.app
# output: build/app/outputs/flutter-apk/app-release.apk
```
If the build log says `android/key.properties not found: release build signed with the DEBUG key`,
stop: fix key.properties and rebuild.

Verify the signature is yours, not the debug key:
```bash
keytool -printcert -jarfile build/app/outputs/flutter-apk/app-release.apk
# Owner/SHA-256 must match: keytool -list -v -keystore ~/keys/sofracom-admin-upload.jks
```

### 3d. Distribute
The new application id installs **next to** the old app. On every staff phone: install
`app-release.apk`, then **uninstall the old "sofracom_admin_app"** so nobody keeps using it.

**Rollback:** reinstall the old APK. It keeps working until step 6 (rules).

---

## 4. Enrol each staff phone

1. Website → `/admin` → **Devices** → **Generate code** (valid 15 min, single use; generating a new
   code replaces the previous one).
2. On the phone, open SOFRACOM Admin, enter the code and a device name (e.g. "Shop counter").
3. The phone opens the Orders tab; the device appears in `/admin` → Devices as **Active**.

Five wrong codes in a row burn the outstanding code; `/admin` then shows
"Code expired or invalidated… Generate a new one" and the event is logged (`deviceEvents`,
plus a `[devices]` warning in Vercel logs).

**Check (each phone):** orders and quotes load; change a test order's status with a note and see
it in the website order timeline (`/account/orders/<id>` for the customer, `/admin` details).
**Rollback:** `/admin` → Devices → Revoke.

---

## 5. Back up Firestore

Exports need the Blaze plan and a bucket in a compatible location.
```bash
gcloud firestore databases describe --database='(default)' --project sofracom --format='value(locationId)'
gsutil mb -p sofracom -l <that location or its multi-region> gs://sofracom-firestore-backups   # once
gcloud firestore export gs://sofracom-firestore-backups/$(date +%Y%m%d-%H%M)-pre-rules --project sofracom
```
**Check:** `gcloud firestore operations list --project sofracom` shows the export `SUCCESSFUL`;
note the folder name.
**Rollback:** n/a (read-only).

---

## 6. Deploy the security rules and indexes

### 6a. Save the current console rules first
1. Firebase console → Firestore Database → **Rules**.
2. Select all of the rules text, copy it, and paste it into **`rules.backup.txt`** at the website
   repo root (git-ignored). Save.
3. Check the file is not empty and starts with `rules_version` or `service cloud.firestore`:
   `head -3 rules.backup.txt`
4. Also note the "Last published" date shown in the console.

### 6b. Deploy
```bash
cd sofracom-marine-services
firebase deploy --only firestore:rules,firestore:indexes --project sofracom
```
If the CLI offers to **delete** indexes that exist in the console but not in
`firestore.indexes.json`, answer **No**.

From this moment, unauthenticated reads/writes are refused: the **old** app stops working
(expected), the new enrolled app keeps working.

**Check:**
- Console → Firestore → Indexes: all composite indexes **Enabled** (building can take minutes;
  `/account/orders`, review eligibility and `/admin` review lists need them).
- Anonymous read is now denied (expect `PERMISSION_DENIED`, 403):
  ```bash
  curl -s "https://firestore.googleapis.com/v1/projects/sofracom/databases/(default)/documents/orders?pageSize=1"
  ```
- Enrolled phones still load orders/quotes; a customer sees only their own orders on `/account`.

**Rollback:** console → Firestore → Rules → paste the contents of `rules.backup.txt` → **Publish**
(or `cp rules.backup.txt /tmp/firestore.rules` and deploy it with a temporary `firebase.json`,
always with `--project sofracom`).
Leaving the new indexes in place is harmless.

---

## 7. Status migration: dry run

Run from the website repo with the **new** key available (git-ignored JSON in the repo root, or
`FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` exported). Make sure no
`FIRESTORE_EMULATOR_HOST` is set in the shell.
```bash
unset FIRESTORE_EMULATOR_HOST FIREBASE_AUTH_EMULATOR_HOST
node scripts/migrate-statuses.mjs
```
**Check:** the first line reads `Target: PRODUCTION · mode: dry run`; review the
`old -> new` list (e.g. `treated -> delivered`, `new -> pending`) and the counts.
**Rollback:** n/a (nothing written).

---

## 8. Status migration: apply

```bash
node scripts/migrate-statuses.mjs --apply
node scripts/migrate-statuses.mjs        # dry run again: should report 0 to update
```
Each changed document keeps its previous value in `legacyStatus` and gets a seeded
`statusHistory`.

**Rollback** (choose one):
- Undo only the status change (tested against the emulator):
  ```bash
  node -e '
  const { getDb, admin } = require("./lib/firebase/admin");
  (async () => {
    for (const name of ["orders", "quotes"]) {
      const snap = await getDb().collection(name).where("legacyStatus", "!=", null).get();
      for (const doc of snap.docs) {
        await doc.ref.update({ status: doc.data().legacyStatus, legacyStatus: admin.firestore.FieldValue.delete() });
      }
      console.log(name + ": restored " + snap.size);
    }
    process.exit(0);
  })();'
  ```
- Full restore from step 5 (overwrites documents changed since the export):
  `gcloud firestore import gs://sofracom-firestore-backups/<folder> --project sofracom`

---

## 9. Verify end to end

- [ ] Guest checkout on the live site works and reaches the phones as a push ("New order #…",
      no customer name in the notification).
- [ ] A signed-in customer orders with a saved address and sees it in `/account/orders`.
- [ ] From a phone: confirm → preparing → out for delivery → delivered; the customer's timeline
      shows each step (with notes).
- [ ] The customer can then review the product once; the product page shows the rating and the
      category card shows stars.
- [ ] `/admin` → Reviews → Hide removes it from the product page and the stats.
- [ ] `/admin` → Devices → revoke a spare/test phone. Its status changes are refused at once;
      the next time the app is opened (or its live list is refused by the rules) it returns to the
      enrolment screen with "This phone was removed…". Re-enrol it with a new code.
- [ ] Anonymous Firestore read is denied (curl in step 6).

---

## Purge the key from the app repo's history (after step 1)

Deleting the key in IAM (step 1) is what makes it harmless; this cleanup stops it being found.
The local app repo has commits that are not on GitHub yet, so purge a copy of the **local** repo
and force-push it.

```bash
brew install git-filter-repo                      # if not installed

# 1. Work on a fresh clone of the local repo (includes the unpushed commits).
git clone --no-local /Users/hassan/IdeaProjects/sofracom_admin_pp /tmp/sofracom_admin_pp-purge
cd /tmp/sofracom_admin_pp-purge

# 2. Remove both files from every commit.
git filter-repo --invert-paths \
  --path assets/firebase_config.json \
  --path sofracom-firebase-adminsdk-fbsvc-94ea761cbb.json

# 3. Verify nothing is left (both commands must print nothing).
git log --all --oneline -- assets/firebase_config.json sofracom-firebase-adminsdk-fbsvc-94ea761cbb.json
git grep -I -l "PRIVATE KEY-----" $(git rev-list --all) -- . | head

# 4. Force-push the rewritten history (filter-repo removed the remote on purpose).
git remote add origin https://github.com/mohamedhassanamara/sofracom_admin_pp.git
git push --force origin main
git push --force --tags origin

# 5. Replace the old working copy (back up anything uncommitted first).
mv /Users/hassan/IdeaProjects/sofracom_admin_pp /Users/hassan/IdeaProjects/sofracom_admin_pp.old
git clone https://github.com/mohamedhassanamara/sofracom_admin_pp.git /Users/hassan/IdeaProjects/sofracom_admin_pp
# copy back android/key.properties (never the old service-account JSON), then delete the .old folder
```

Afterwards: anyone else with a clone must re-clone (an old clone can push the key back). Check
GitHub for forks. GitHub may still serve the old commits by SHA from its cache; with the key
deleted in IAM that is harmless, and GitHub Support can purge cached views if needed.
