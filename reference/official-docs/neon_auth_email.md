# パスワード認証（メール）— Neon Auth / Managed Better Auth

> **出典:**
> - https://neon.com/docs/auth/overview
> - https://neon.com/docs/auth/authentication-flow
> - https://neon.com/docs/auth/guides/email-verification
> - https://neon.com/docs/auth/guides/password-reset
> - https://neon.com/docs/auth/guides/user-management
> - https://neon.com/docs/auth/guides/plugins
> - https://neon.com/docs/auth/guides/plugins/admin
> - https://neon.com/docs/data-api/get-started
>
> **取得日:** 2026年7月26日
>
> **ステータス:** Managed Better Auth は **Beta**（Better Auth v1.4.18ベース）。AWSリージョンのみ対応。IP AllowまたはPrivate Networkingを有効にしたプロジェクトは非対応。仕様変更が入りやすい領域のため、実装前に上記出典を再確認すること。

メールアドレスに紐づいたパスワードでユーザーがサインインできるようにする。

---

## 0. Neon Authとは

Neon Auth（Managed Better Auth）は、ユーザー・セッション・認証設定を **自分のNeonデータベース内** の `neon_auth` スキーマに保存するマネージド認証サービスである。

```
アプリ（SDK）
    ↓ HTTPリクエスト
Neon Auth サービス（REST API）
    ↓ データベースへ接続
自分のNeonデータベース（neon_auth スキーマ）
```

主な特性：

- IDが自分のデータベースに存在する（`neon_auth.user`、`neon_auth.account`、`neon_auth.session`、`neon_auth.verification`）。SQLで参照でき、RLSと組み合わせられる。
- 認証状態が **データベースと一緒にブランチする**。各Neonブランチが独立したユーザー・セッション・認証設定を持つ。
- パスワードのハッシュ化・ソルト・セッション管理はサービス側が担当する。自前でハッシュを実装・保存することはない。
- 管理するサーバーはない。設定はConsole、実装はSDK。
- 料金はMAU（月間アクティブユーザー）ベース（Free：60,000 MAUまで／Launch・Scale：1M MAUまで）。

### この方式ではemailが識別子として必須である ⚠️ 重要

メール／パスワード方式では、**メールアドレスがログインIDであり必須** である。Neon Authが現時点で公開しているBetter Authプラグインは以下のサブセットのみ。

| プラグイン | 状態 |
| ---------- | ---- |
| Admin | ✅ 対応 |
| Email OTP | ✅ 対応 |
| JWT | ✅ 対応 |
| Magic Link | ✅ 対応 |
| Organization | ⚠️ 部分対応（JWTトークンクレームは開発中） |
| Open API | ✅ 対応 |
| Phone Number | ✅ 対応 |

Better Authの **Usernameプラグインは非対応** であるため、「メールアドレスの代わりにユーザー名でログインする」モードは組み込みでは存在しない。実在のメールアドレスを収集したくない場合の選択肢は次の4つ。

1. **運営が発行する内部（ダミー）メールアドレス** — 例：`taro@example.invalid`。標準のメール／パスワードフローで動作するが、§11の制約を必ず確認する。
2. **OAuth／ソーシャルログイン** — パスワードを扱わずに済むが、エンドユーザー全員が使用可能なプロバイダーアカウントを持っている必要がある。
3. **Phone Numberプラグイン** — メールの代わりに電話番号（SMS OTP）を使う。個人情報の種類が入れ替わるだけである点に注意。
4. **Magic Link / Email OTP** — いずれも配信可能なメールアドレスが前提。

---

## 1. メール／パスワード認証の有効化

メール／パスワードのサインインは、Neon Consoleで **ブランチごとに** 設定する。

1. プロジェクト → **Settings** → **Auth**（または **Auth** ページ → **Configuration**）を開く
2. **Sign-up with Email** / **Sign-in with Email** を有効にする
3. 必要に応じて **Verify at Sign-up** を有効にし、検証方法（**Verification code** または **Verification link**）を選ぶ

プログラムからも設定できる。

- **Neon API:** ベースURL `https://console.neon.tech/api/v2`、ヘッダー `Authorization: Bearer $NEON_API_KEY`
- **Neon MCPサーバー:** `provision_neon_auth`、`configure_neon_auth`、`get_neon_auth_config`（AIエディタから使う場合は `npx neon@latest init` で接続）

**警告：既定ではサインアップが誰でも可能である。** ⚠️
Neon公式ドキュメントには「既定では誰でもアプリにサインアップできる」と明記されており、サインアップ制限機能は「近日対応」とされている。アカウント作成を運営のみに限定する設計の場合、この既定動作への対処を明示的に設計する必要がある（§11参照）。

---

## 2. クライアントのセットアップ

### React / Vite（クライアントサイド）

```ts
// src/auth.ts
import { createAuthClient } from '@neondatabase/neon-js/auth';

export const authClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL);
```

Neon AuthとData APIを1つのクライアントで扱いたい場合は、`@neondatabase/neon-js` の `createClient()` を使う。

### Next.js（サーバーサイド）

```ts
// lib/auth/server.ts
import { createNeonAuth } from '@neondatabase/auth/next/server';

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});
```

```ts
// app/api/auth/[...path]/route.ts
import { auth } from '@/lib/auth/server';

export const { GET, POST } = auth.handler();
```

```ts
// lib/auth/client.ts
'use client';
import { createAuthClient } from '@neondatabase/auth/next';

export const authClient = createAuthClient();
```

既製UIは `@neondatabase/auth-ui` から利用できる（`NeonAuthUIProvider`、`AuthView`、`ForgotPasswordForm`、`ResetPasswordForm`）。

---

## 3. メールとパスワードでのサインアップ

```js
async function signUpNewUser() {
  const { data, error } = await authClient.signUp.email({
    email: 'athlete@example.com',
    password: 'example-password',
    name: 'Athlete Name',
  });
}
```

サーバー側の動作：SDKが `{NEON_AUTH_URL}/auth/sign-up/email` にPOSTする。サービスは `neon_auth.user` に行を作成し、ハッシュ化した資格情報を `neon_auth.account` に保存してユーザーを返す。メール検証が必須の場合は `neon_auth.verification` にトークンを作成し、検証完了までセッション作成を保留することがある。

```js
if (data?.user && !data.user.emailVerified) {
  // 「メールを確認してください」のUIを表示する
}
```

---

## 4. メールとパスワードでのサインイン

```js
async function signInWithEmail() {
  const { data, error } = await authClient.signIn.email({
    email: 'athlete@example.com',
    password: 'example-password',
  });
}
```

レスポンスの構造：

```ts
{
  data: {
    session: {
      access_token: "eyJhbGc...",  // JWT
      expires_at: 1763848395,
    },
    user: {
      id: "dc42fa70-09a7-4038-a3bb-f61dda854910",
      email: "athlete@example.com",
      emailVerified: true,
    }
  }
}
```

### セッションとトークン

- サービスはHTTP-onlyクッキー `__Secure-neonauth.session_token` を設定する（JWTではない不透明トークン。HTTPSのみ、HttpOnly、SameSite=None）。SDKが完全に管理するため、開発者が直接触ることはない。
- SDKはJWTを自動取得し、`session.access_token` に保持する。JWTの有効期限は約15分。
- JWTのクレーム：

```json
{
  "sub": "dc42fa70-09a7-4038-a3bb-f61dda854910",
  "email": "athlete@example.com",
  "role": "authenticated",
  "exp": 1763848395,
  "iat": 1763847495
}
```

- `sub` は `neon_auth.user.id` である。RLSポリシーが `auth.user_id()` / `auth.uid()` で読み取るのはこの値である。

### セッション状態の取得

```js
const { data } = await authClient.getSession();
if (data?.session) { /* サインイン済み */ }
```

```js
await authClient.signOut();
```

---

## 5. メールアドレスの検証

Neon Authは2つの検証方法に対応する。

| 方法 | 要件 | 備考 |
| ---- | ---- | ---- |
| **検証コード**（数字のOTP） | 共有メールプロバイダーでも利用可 | ユーザーがアプリ内でコードを入力する |
| **検証リンク** | **カスタムメールプロバイダーが必須** | ユーザーがリンクをクリックし、Neon Authが検証後にリダイレクトする |

いずれも **15分** で失効する。

```js
// コードで検証する
const { data, error } = await authClient.emailOtp.verifyEmail({ email, otp: code });
```

```js
// 再送する
const { error } = await authClient.sendVerificationEmail({
  email,
  callbackURL: window.location.origin + '/',
});
```

検証状態はユーザーオブジェクトから確認する。

```js
const { data } = await authClient.getSession();
if (data?.session?.user && !data.session.user.emailVerified) {
  // 機能を制限する、または検証を促す
}
```

**必須と任意の違い:** Consoleの設定で検証を *必須* にすると、検証が完了するまでサインインできない。*任意* にすると、即座にサインインできるが `emailVerified` は `false` のままになる。

---

## 6. パスワードのリセット

Neon Authのパスワードリセットは **メールリンク方式のみ** である。

- **Settings** → **Auth** で **Sign-up with Email** を有効にすると、パスワードリセットが利用可能になる。
- リセットリンクは **15分** で失効する。
- ⚠️ パスワードリセットのSDKメソッド（`resetPasswordForEmail`）は **まだ完全対応していない**。UIコンポーネントを使用する。

```tsx
import { NeonAuthUIProvider, AuthView } from '@neondatabase/auth-ui';

<NeonAuthUIProvider authClient={authClient}>
  <AuthView pathname="sign-in" credentials={{ forgotPassword: true }} />
</NeonAuthUIProvider>
```

個別フォームを使う場合：

```tsx
import { ForgotPasswordForm, ResetPasswordForm } from '@neondatabase/auth-ui';

<ForgotPasswordForm
  authClient={authClient}
  redirectTo={`${window.location.origin}/reset-password`}
  onSuccess={(data) => { /* data.email */ }}
/>

<ResetPasswordForm authClient={authClient} email={email} onSuccess={() => {}} />
```

フロー：リセット要求 → リセットトークン付きメール受信 → リンクを開く → 新しいパスワードを送信 → パスワード更新（自動サインインが有効ならそのままログイン）。

**ダミーメール設計への影響:** アドレスが配信不能な場合、このフローは使用できない。代わりに `admin.setUserPassword()` を使う（§8）。

---

## 7. サインイン済みユーザーのパスワード変更・プロフィール更新

### パスワード変更

現在のパスワードが必要である。

```js
const { data, error } = await authClient.changePassword({
  newPassword: 'new-secure-password',
  currentPassword: 'current-password',
  revokeOtherSessions: true, // 任意：他の全デバイスをサインアウトさせる
});
```

### プロフィール更新

```js
const { data, error } = await authClient.updateUser({ name: 'New Name' });
// その後リフレッシュする
const { data: s } = await authClient.getSession();
```

更新可能なフィールドは `name`（表示名）。⚠️ **メールアドレスの変更は `updateUser()` では対応していない。** 発行したメールアドレス（内部ID）は、一度発行したら変更不可として設計する（管理者側からの更新は§8で可能だが、固定であることを前提に計画するのが安全）。

---

## 8. Admin API（運営がアカウントを発行する運用）

**Adminプラグイン** はNeon Auth側で有効化されており、自分でインストール・設定する必要はない。運営主導のアカウントライフサイクル（バックオフィスでのオンボーディング、サポートツール）を実現する手段である。

**前提条件**

- Authを有効化したNeonプロジェクト
- **admin** ロールを持つユーザー。Consoleで付与する：**Auth** → **Users** → 三点メニュー → **Make admin**

**制約** ⚠️

- Admin操作にはHTTP-onlyクッキーによる認証済みセッションが必要である。したがって管理ツールは、そのクッキーをNeon Auth APIへ送信できる同一サイト上で動作しなければならない。
- なりすまし（impersonation）セッションはブラウザセッションの間、または最大1時間で終了する。

### ユーザーの作成

| パラメータ | 型 | 必須 | 備考 |
| ---------- | -- | :--: | ---- |
| email | string | ✓ | 新規ユーザーのメールアドレス |
| password | string | ✓ | 新規ユーザーのパスワード |
| name | string | ✓ | 表示名 |
| role | string \| string[] | | 例：`user`、`admin` |
| data | Record<string, any> | | カスタムフィールド |

```ts
const { data, error } = await authClient.admin.createUser({
  email: 'user@email.com',
  password: 'secure-password',
  name: 'User Name',
  role: 'user',
  data: { customUserField: 'value' },
});
```

### パスワードの設定（初期化）

```ts
const { error } = await authClient.admin.setUserPassword({
  userId: 'user-id',
  newPassword: 'new-secure-password',
});
```

### ユーザー一覧の取得

```ts
const { data, error } = await authClient.admin.listUsers({
  query: {
    searchValue: 'text to search',
    searchField: 'email',        // 'email' | 'name'
    searchOperator: 'contains',  // 'contains' | 'starts_with' | 'ends_with'
    limit: 10,
    offset: 0,
    sortBy: 'name',
    sortDirection: 'asc',
  },
});
// → { users: [...], total, limit, offset }
```

`filterField` / `filterValue` / `filterOperator`（`eq`、`ne`、`lt`、`lte`、`gt`、`gte`）でロールなどによる追加の絞り込みができる。

### ロール、Ban／Unban（無効化・再有効化）

```ts
await authClient.admin.setRole({ userId: 'user-id', role: 'admin' });

await authClient.admin.banUser({
  userId: 'user-id',
  banReason: 'チームを離脱',
  // banExpiresIn: 60 * 60 * 24, // 秒。省略すると無期限
});

await authClient.admin.unbanUser({ userId: 'user-id' });
```

Banは **サインインを禁止する** 一方で、ユーザー行とアプリケーション側のデータはそのまま残る。過去の記録を保持したままアカウントを無効化する標準的な方法である。

### ユーザー情報の更新

```ts
await authClient.admin.updateUser({
  userId: 'user-id',
  data: { name: 'New Name' }, // email、name、カスタムフィールド
});
```

### セッション管理

```ts
await authClient.admin.listUserSessions({ userId: 'user-id' });
await authClient.admin.revokeUserSession({ sessionToken: 'session-token' });
await authClient.admin.revokeUserSessions({ userId: 'user-id' });
```

### なりすまし（サポート・デバッグ用）

```ts
await authClient.admin.impersonateUser({ userId: 'user-id' });
await authClient.admin.stopImpersonating();
```

---

## 9. 認証データをSQLで参照する

```sql
SELECT id, email, "emailVerified", "createdAt"
FROM neon_auth.user
ORDER BY "createdAt" DESC;
```

`neon_auth` スキーマのテーブル：`user`、`account`（資格情報・OAuthトークン）、`session`、`verification`。変更は即時反映され、同期遅延やWebhookパイプラインは存在しない。パスワードはハッシュのみが保存され、自分・Neon・Authサービスのいずれも平文を復元できない。

---

## 10. セッションをData API（RLS）で使う

Data APIを **Use Managed Better Auth** で有効化すると、SDKが自動的にJWTを付与し、Data APIがJWKSで検証する。

```ts
const { data } = await client.from('condition_logs').select('*');
// Authorization: Bearer <jwt> はSDKが付与する
```

SQL側で使えるRLSヘルパー：

- `auth.user_id()` → `sub` を `text` で返す
- `auth.uid()` → `sub` を `uuid` で返す（`sub` が有効なUUIDでない場合は `NULL`）

```sql
CREATE POLICY "Users can view own logs"
ON condition_logs FOR SELECT TO authenticated
USING (user_id = auth.user_id());
```

`neon_rls.md` を参照。

### アプリなしでテストする

`{AUTH_URL}/reference`（Better AuthのOpenAPI UI）を開くと、`POST /sign-up/email`、`POST /sign-in/email`、`GET /get-session` を実行できる。`Set-Auth-Jwt` レスポンスヘッダーからJWTをコピーし、Data APIへのBearerトークンとして使う。cURLでも同じことができる（`-c cookies.txt` でセッションクッキーを保存、`-b cookies.txt -D -` で `set-auth-jwt` ヘッダーを読む）。

---

## 11. 設計上考慮すべき制約（チェックリスト）

| 項目 | 状態 | 設計への影響 |
| ---- | ---- | ------------ |
| ログインIDとしてemailが必須 | 確認済み | ユーザー名ログインは不可。ダミーアドレスが回避策 |
| 既定でサインアップが公開 | 確認済み ⚠️ | 「サインアップ制限は近日対応」。運営限定のアカウント作成は別手段で担保する必要がある（ConsoleでEmailサインアップを無効化しつつAdmin APIでのみ作成する構成が可能か — ⚠️実プロジェクトでの検証が必要） |
| `updateUser()` でのメール変更 | 非対応 | 発行したIDは実質的に永続 |
| メールによるパスワードリセット | 配信可能なアドレスが前提 | ダミーアドレスの場合は `admin.setUserPassword()` を使う |
| 検証リンク | カスタムメールプロバイダーが必須 | 検証コードなら共有プロバイダーで動作する |
| 初回ログイン時のパスワード変更強制 | 組み込み機能なし ⚠️ | アプリ側で実装する（独自フラグ列＋リダイレクト） |
| Admin APIの認証 | セッションクッキー、同一サイト | 管理UIを同じデプロイに含める必要がある |
| Betaステータス／AWSのみ | 確認済み | Azure非対応。IP AllowとPrivate Networkingも非対応 |

---

## 12. ダッシュボードのパス

| 操作 | ダッシュボードパス |
| --- | --- |
| Authの有効化 | プロジェクト → ブランチ → **Auth** → Enable Auth |
| サインイン方式・メール検証の設定 | **Settings** → **Auth**（Sign-up with Email / Verify at Sign-up / Verification method） |
| Auth URLの確認 | **Auth** ページ → **Configuration** タブ |
| ユーザー一覧・adminロール付与 | **Auth** → **Users** → 三点メニュー → **Make admin** |
| プラグイン設定 | **Auth** → **Plugins**（beta） |
| カスタムメールプロバイダー／アプリ名 | **Settings** → **Auth**（production checklist参照） |
| Data APIとAuthの連携 | **Data API** ページ → **Use Managed Better Auth** |
| Auth APIリファレンス（テスト用） | `{AUTH_URL}/reference` |

---

## 付録：Supabase → Neon Auth 対応表

| Supabase | Neon Auth（Managed Better Auth） |
| -------- | -------------------------------- |
| `supabase.auth.signUp({ email, password })` | `authClient.signUp.email({ email, password, name })` |
| `supabase.auth.signInWithPassword({ email, password })` | `authClient.signIn.email({ email, password })` |
| `supabase.auth.signOut()` | `authClient.signOut()` |
| `supabase.auth.getSession()` | `authClient.getSession()` |
| `supabase.auth.updateUser({ password })` | `authClient.changePassword({ currentPassword, newPassword })` |
| `supabase.auth.resetPasswordForEmail()` | `<ForgotPasswordForm>` / `<ResetPasswordForm>`（SDKメソッドは未対応） |
| 電話番号＋パスワードでのサインアップ | Phone Numberプラグイン（OTP方式） |
| `auth.users` テーブル | `neon_auth.user` テーブル |
| Service role key（RLSをバイパス） | 単一のキーは存在しない。特権アクセスはテーブルオーナーとしてのPostgres接続経由（`neon_rls.md` 参照） |
| メール確認のトグル（Auth Providersページ） | **Verify at Sign-up**（Settings → Auth） |
| 本番用のカスタムSMTP | カスタムメールプロバイダー（検証リンクには必須） |
| GoTrueのセルフホスト | Better Authのセルフホスト |
