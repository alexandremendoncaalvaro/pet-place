# Security Spec for Caixinha Pet Place

## 1. Data Invariants
- A `payment` must belong to a valid user.
- A `payment` amount must be positive.
- An `expense` can only be created by an Admin.
- Only Admins can modify the `status` of a `payment`.
- The aggregate balance is derived, not stored directly as a single field that could be manually written to, but for performance, we might store a running balance or just calculate it block by block. Wait, the spec says: "O Saldo Atual da caixinha nunca é um número digitado manualmente. Ele é o resultado matemático de..." This means we calculate it on the fly, or have a secure aggregate logic.

## 2. The "Dirty Dozen" Payloads
1.  **Identity Spoofing**: User A trying to create a payment as User B.
2.  **State Shortcutting**: User creating a payment with status 'approved'.
3.  **Role Escalation**: User modifying their own role to 'admin'.
4.  **Ghost Field (Shadow Update)**: User adding `isVerified: true` to their user profile.
5.  **Ghost Field (Payment)**: User adding an arbitrary field to a payment update.
6.  **Value Poisoning**: User sending a string instead of a number for `amount`.
7.  **Terminal State Bypass**: User trying to update an 'approved' payment back to 'pending'.
8.  **Admin Spoofing**: Admin action triggered by a resident.
9.  **Orphan Expense**: Expense created without a valid admin ID.
10. **Array Explosion**: Not applicable (we don't use arrays for lists).
11. **Negative Amount**: User submitting a payment or expense with a negative amount.
12. **PII Blanket Read**: A resident trying to list all users, gaining access to everyone's phone numbers. (Resident should only list basic public info, or if `users` must be accessed, we split PII or restrict). The spec says: "A lista de inadimplentes deve ser visível apenas para o Administrador. Os moradores veem apenas o seu próprio status." -> Residents CANNOT list other residents' private payment statuses or phone numbers.

## 3. Test Runner
We will create a test suite in `firestore.rules.test.ts`.
