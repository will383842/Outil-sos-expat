import React, { useState } from "react";
import { Star } from "lucide-react";
import { useIntl } from "react-intl";
import Button from "../common/Button";
import { useAuth } from "../../contexts/AuthContext";
import { createReviewRecord } from "../../utils/firestore";

interface ReviewFormProps {
  providerId: string;
  providerName?: string; // optionnel, utilisé dans le titre si fourni
  callId: string;
  serviceType: "lawyer_call" | "expat_call";
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  providerId,
  providerName,
  callId,
  serviceType,
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const intl = useIntl();
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isLawyer = serviceType === "lawyer_call";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsSubmitting(true);
    setError(null);

    if (!comment.trim()) {
      setError(intl.formatMessage({ id: "reviewForm.error.commentRequired" }));
      setIsSubmitting(false);
      return;
    }

    if (!user) {
      setError(intl.formatMessage({ id: "reviewForm.error.loginRequired" }));
      setIsSubmitting(false);
      return;
    }

    if (rating < 1) {
      setError(intl.formatMessage({ id: "reviewForm.error.ratingRequired" }));
      setIsSubmitting(false);
      return;
    }
    try {
      // ✅ NE PAS forcer status ni isPublic : la logique est dans createReviewRecord
      await createReviewRecord({
        clientId: user.id,
        clientName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        clientCountry: user.currentCountry || "",
        providerId,
        callId,
        rating,
        comment,
        serviceType,
        helpfulVotes: 0,
        reportedCount: 0,
      });

      // Scroll vers la section des avis
      const reviewsSection = document.getElementById("reviews-section");
      if (reviewsSection) {
        reviewsSection.scrollIntoView({ behavior: "smooth" });
      }

      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(
        intl.formatMessage(
          { id: "reviewForm.error.submitFailed" },
          { message }
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleKey = isLawyer ? "reviewForm.title.lawyer" : "reviewForm.title.expat";
  const titleBase = intl.formatMessage({ id: titleKey });
  const titleWithName = providerName 
    ? `${titleBase}${intl.formatMessage({ id: "reviewForm.title.withName" }, { name: providerName })}`
    : titleBase;

  return (
    <div className="bg-white rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        {titleWithName}
      </h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {intl.formatMessage({ id: "reviewForm.label.rating" })}
          </label>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="focus:outline-none"
                aria-label={intl.formatMessage(
                  { id: "reviewForm.aria.rating" },
                  { count: star, plural: star > 1 ? "s" : "" }
                )}
              >
                <Star
                  size={32}
                  className={
                    star <= rating
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  }
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="comment"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {intl.formatMessage({ id: "reviewForm.label.comment" })}
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setComment(e.target.value)
            }
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
            placeholder={intl.formatMessage({ id: "reviewForm.placeholder.comment" })}
          />
        </div>

        <div className="flex justify-end space-x-3">
          {onCancel && (
            <Button type="button" onClick={onCancel} variant="outline">
              {intl.formatMessage({ id: "reviewForm.button.cancel" })}
            </Button>
          )}
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitting || rating < 1}
          >
            {intl.formatMessage({ id: "reviewForm.button.submit" })}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;
