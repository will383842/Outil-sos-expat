import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

// Import the existing getStripe function from index
import { getStripe } from "./index";

// Create Custom Connected Account
export const createCustomAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { email, country } = request.data;
  const stripe = getStripe(); // Use existing Stripe instance

  if (!stripe) {
    throw new HttpsError("internal", "Stripe is not configured");
  }

  try {
    const account = await stripe.accounts.create({
      type: "custom",
      country: country || "FR",
      email: email,
      business_type: "individual",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: request.rawRequest.ip || "unknown",
      },
    });

    await admin.firestore().collection("lawyers").doc(request.auth.uid).update({
      stripeAccountId: account.id,
      kycStatus: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { accountId: account.id, success: true };
  } catch (error: any) {
    console.error("Error creating account:", error);
    throw new HttpsError("internal", error.message);
  }
});

// Submit KYC Data
interface KycData {
  accountId: string;
  firstName: string;
  lastName: string;
  email: string;
  dobDay: number;
  dobMonth: number;
  dobYear: number;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  panNumber: string;
}

export const submitKycData = onCall<KycData>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {
    accountId,
    firstName,
    lastName,
    email,
    dobDay,
    dobMonth,
    dobYear,
    addressLine1,
    city,
    state,
    postalCode,
    panNumber,
  } = request.data;

  const stripe = getStripe();

  if (!stripe) {
    throw new HttpsError("internal", "Stripe is not configured");
  }

  try {
    const account = await stripe.accounts.update(accountId, {
      business_profile: {
        mcc: "7399",
        url: "https://sos-expat.com",
      },
      individual: {
        first_name: firstName,
        last_name: lastName,
        email: email,
        dob: {
          day: parseInt(String(dobDay)),
          month: parseInt(String(dobMonth)),
          year: parseInt(String(dobYear)),
        },
        address: {
          line1: addressLine1,
          city: city,
          state: state,
          postal_code: postalCode,
          country: "FR",
        },
        id_number: panNumber,
      },
    });

    await admin.firestore().collection("lawyers").doc(request.auth.uid).update({
      kycSubmitted: true,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, account };
  } catch (error: any) {
    console.error("Error submitting KYC:", error);
    throw new HttpsError("internal", error.message);
  }
});

// Add Bank Account
interface BankAccountData {
  accountId: string;
  accountNumber: string;
  ifscCode: string;
}

export const addBankAccount = onCall<BankAccountData>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { accountId, accountNumber, ifscCode } = request.data;
  const stripe = getStripe();

  if (!stripe) {
    throw new HttpsError("internal", "Stripe is not configured");
  }

  try {
    const bankAccount = await stripe.accounts.createExternalAccount(accountId, {
      external_account: {
        object: "bank_account",
        country: "FR", // Changed from IN to FR for France
        currency: "eur", // Changed from inr to eur for France
        account_number: accountNumber,
        routing_number: ifscCode, // Use IBAN for France instead
      },
    });

    await admin.firestore().collection("lawyers").doc(request.auth.uid).update({
      bankAccountAdded: true,
      bankAccountId: bankAccount.id,
    });

    return { success: true, bankAccount };
  } catch (error: any) {
    console.error("Bank account error:", error);
    throw new HttpsError("internal", error.message);
  }
});

// Check KYC Status
interface KycStatusData {
  accountId: string;
}

export const checkKycStatus = onCall<KycStatusData>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { accountId } = request.data;
  const stripe = getStripe();

  if (!stripe) {
    throw new HttpsError("internal", "Stripe is not configured");
  }

  try {
    const account = await stripe.accounts.retrieve(accountId);

    const status = {
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements,
    };

    await admin.firestore().collection("lawyers").doc(request.auth.uid).update({
      verificationStatus: status,
      lastChecked: admin.firestore.FieldValue.serverTimestamp(),
    });

    return status;
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});
