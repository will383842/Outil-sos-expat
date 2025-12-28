import axios, { AxiosError } from "axios";
import { validateMailWizzConfig } from "../config";

interface MailwizzConfig {
  apiUrl: string;
  apiKey: string;
  listUid: string;
  customerId: string;
}

export interface SubscriberData {
  EMAIL: string;
  FNAME?: string;
  LNAME?: string;
  [key: string]: any;
}

export interface TransactionalEmailConfig {
  to: string; // User ID or email
  template: string; // Template UID or name
  customFields?: Record<string, string>;
}

export class MailwizzAPI {
  private config: MailwizzConfig;

  constructor() {
    this.config = validateMailWizzConfig();
  }

  /**
   * Create a new subscriber in MailWizz
   * Note: MailWizz API requires:
   * 1. Field names in UPPERCASE (EMAIL, FNAME, LNAME, etc.)
   * 2. Form-encoded data (application/x-www-form-urlencoded), NOT JSON!
   */
  async createSubscriber(data: SubscriberData): Promise<any> {
    try {
      // MailWizz API requires field names in UPPERCASE
      // Ensure EMAIL field is uppercase (it should already be from SubscriberData interface)
      const requestData = { ...data };

      // Ensure email is in uppercase EMAIL format
      if (requestData.email && !requestData.EMAIL) {
        requestData.EMAIL = requestData.email;
        delete requestData.email;
      }

      // Convert to form-encoded data (MailWizz expects form data, not JSON!)
      const formData = new URLSearchParams();
      Object.entries(requestData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      const response = await axios.post(
        `${this.config.apiUrl}/lists/${this.config.listUid}/subscribers`,
        formData.toString(), // Send as form-encoded string
        {
          headers: {
            "X-MW-PUBLIC-KEY": this.config.apiKey,
            "X-MW-CUSTOMER-ID": this.config.customerId,
            "Content-Type": "application/x-www-form-urlencoded", // Form data, not JSON!
            "User-Agent": "SOS-Platform/1.0",
          },
        }
      );

      const email = requestData.EMAIL || requestData.email || "unknown";
      console.log(`✅ Subscriber created: ${email}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(
        `❌ Error creating subscriber:`,
        axiosError.response?.data || axiosError.message
      );
      throw error;
    }
  }

  /**
   * Update an existing subscriber in MailWizz
   * Note: MailWizz API expects form-encoded data, not JSON!
   */
  async updateSubscriber(
    userId: string,
    updates: Record<string, string>
  ): Promise<any> {
    try {
      console.log("hit sthe update subscribed method");

      // Convert to form-encoded data
      const formData = new URLSearchParams();
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      // Try to update by subscriber UID first, then by email
      let response;
      try {
        response = await axios.put(
          `${this.config.apiUrl}/lists/${this.config.listUid}/subscribers/${userId}`,
          formData.toString(), // Send as form-encoded string
          {
            headers: {
              "X-MW-PUBLIC-KEY": this.config.apiKey,
              "X-MW-CUSTOMER-ID": this.config.customerId,
              "Content-Type": "application/x-www-form-urlencoded", // Form data, not JSON!
              "User-Agent": "SOS-Platform/1.0",
            },
          }
        );
      } catch (updateError) {
        // If update by UID fails, try to find by email and update
        // This is a fallback for cases where we have email but not UID
        const email = updates.EMAIL;
        if (email) {
          try {
            // First, find the subscriber by email
            const searchResponse = await axios.get(
              `${this.config.apiUrl}/lists/${this.config.listUid}/subscribers/search?EMAIL=${encodeURIComponent(email)}`,
              {
                headers: {
                  "X-MW-PUBLIC-KEY": this.config.apiKey,
                  "X-MW-CUSTOMER-ID": this.config.customerId,
                  "User-Agent": "SOS-Platform/1.0",
                },
              }
            );

            const subscriberUid = searchResponse.data?.data?.subscriber_uid;

            if (subscriberUid) {
              // Now update using the correct UID
              response = await axios.put(
                `${this.config.apiUrl}/lists/${this.config.listUid}/subscribers/${subscriberUid}`,
                formData.toString(), // Send as form-encoded string
                {
                  headers: {
                    "X-MW-PUBLIC-KEY": this.config.apiKey,
                    "X-MW-CUSTOMER-ID": this.config.customerId,
                    "Content-Type": "application/x-www-form-urlencoded", // Form data, not JSON!
                    "User-Agent": "SOS-Platform/1.0",
                  },
                }
              );
              console.log(`✅ Subscriber found and updated via fallback: ${subscriberUid}`);
            } else {
              console.warn(`⚠️ Subscriber not found by email: ${email}`);
              throw updateError;
            }
          } catch (searchError) {
            console.error(`❌ Error searching for subscriber by email:`, searchError);
            throw updateError;
          }
        } else {
          throw updateError;
        }
      }

      console.log(`✅ Subscriber updated: ${userId}`, updates);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(
        `❌ Error updating subscriber:`,
        axiosError.response?.data || axiosError.message
      );
      throw error;
    }
  }

  /**
   * Send a transactional email using MailWizz template
   */
  async sendTransactional(config: TransactionalEmailConfig): Promise<any> {
    try {
      const response = await axios.post(
        `${this.config.apiUrl}/transactional-emails`,
        {
          to_email: config.to,
          template_uid: config.template,
          custom_fields: config.customFields || {},
        },
        {
          headers: {
            "X-MW-PUBLIC-KEY": this.config.apiKey,
            "X-MW-CUSTOMER-ID": this.config.customerId,
            "Content-Type": "application/json",
            "User-Agent": "SOS-Platform/1.0",
          },
        }
      );

      console.log(
        `✅ Transactional email sent: ${config.template} to ${config.to}`
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(
        `❌ Error sending transactional email:`,
        axiosError.response?.data || axiosError.message
      );
      throw error;
    }
  }

  /**
   * Unsubscribe a subscriber from MailWizz
   */
  async unsubscribeSubscriber(userId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.config.apiUrl}/lists/${this.config.listUid}/subscribers/${userId}/unsubscribe`,
        {},
        {
          headers: {
            "X-MW-PUBLIC-KEY": this.config.apiKey,
            "X-MW-CUSTOMER-ID": this.config.customerId,
            "User-Agent": "SOS-Platform/1.0",
          },
        }
      );

      console.log(`✅ Subscriber unsubscribed: ${userId}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(
        `❌ Error unsubscribing:`,
        axiosError.response?.data || axiosError.message
      );
      throw error;
    }
  }

  /**
   * Delete a subscriber from MailWizz
   */
  async deleteSubscriber(userId: string): Promise<any> {
    try {
      const response = await axios.delete(
        `${this.config.apiUrl}/lists/${this.config.listUid}/subscribers/${userId}`,
        {
          headers: {
            "X-MW-PUBLIC-KEY": this.config.apiKey,
            "X-MW-CUSTOMER-ID": this.config.customerId,
            "User-Agent": "SOS-Platform/1.0",
          },
        }
      );

      console.log(`✅ Subscriber deleted: ${userId}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(
        `❌ Error deleting subscriber:`,
        axiosError.response?.data || axiosError.message
      );
      throw error;
    }
  }

  /**
   * Send a one-time email (not using templates)
   */
  async sendOneTimeEmail(config: {
    to: string;
    subject: string;
    html: string;
  }): Promise<any> {
    try {
      const response = await axios.post(
        `${this.config.apiUrl}/transactional-emails/send`,
        {
          to_email: config.to,
          subject: config.subject,
          body: config.html,
        },
        {
          headers: {
            "X-MW-PUBLIC-KEY": this.config.apiKey,
            "X-MW-CUSTOMER-ID": this.config.customerId,
            "Content-Type": "application/json",
            "User-Agent": "SOS-Platform/1.0",
          },
        }
      );

      console.log(`✅ One-time email sent to ${config.to}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(
        `❌ Error sending one-time email:`,
        axiosError.response?.data || axiosError.message
      );
      throw error;
    }
  }

  /**
   * Stop autoresponders for a subscriber
   * Note: MailWizz stops autoresponders when subscriber status is updated to certain values
   * Or by removing subscriber from autoresponder list/segment
   */
  async stopAutoresponders(userId: string, reason?: string): Promise<any> {
    try {
      // Method 1: Update subscriber status to stop autoresponders
      // Update ACTIVITY_STATUS to indicate user is active and doesn't need autoresponders
      const formData = new URLSearchParams();
      formData.append("AUTORESPONDER_STATUS", "stopped");
      if (reason) {
        formData.append("AUTORESPONDER_STOP_REASON", reason);
      }

      const response = await axios.put(
        `${this.config.apiUrl}/lists/${this.config.listUid}/subscribers/${userId}`,
        formData.toString(),
        {
          headers: {
            "X-MW-PUBLIC-KEY": this.config.apiKey,
            "X-MW-CUSTOMER-ID": this.config.customerId,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "SOS-Platform/1.0",
          },
        }
      );

      console.log(`✅ Autoresponders stopped for subscriber: ${userId}`, reason ? `(Reason: ${reason})` : "");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(
        `❌ Error stopping autoresponders:`,
        axiosError.response?.data || axiosError.message
      );
      // Don't throw - autoresponder stopping is not critical
      return null;
    }
  }
}


