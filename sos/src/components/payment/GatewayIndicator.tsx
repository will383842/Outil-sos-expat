// src/components/payment/GatewayIndicator.tsx
import React from "react";
import { CreditCard, Shield } from "lucide-react";
import { FormattedMessage } from "react-intl";

interface GatewayIndicatorProps {
  gateway: "stripe" | "paypal";
  className?: string;
  showDescription?: boolean;
}

export const GatewayIndicator: React.FC<GatewayIndicatorProps> = ({
  gateway,
  className = "",
  showDescription = true,
}) => {
  if (gateway === "paypal") {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex items-center px-3 py-1.5 bg-[#003087] rounded-md">
          <svg
            className="w-5 h-5 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" />
          </svg>
          <span className="ml-2 text-white font-semibold text-sm">PayPal</span>
        </div>
        {showDescription && (
          <div className="flex items-center text-gray-600 text-sm">
            <Shield className="w-4 h-4 mr-1 text-green-500" />
            <FormattedMessage
              id="payment.gateway.paypal.secure"
              defaultMessage="Paiement sécurisé"
            />
          </div>
        )}
      </div>
    );
  }

  // Stripe
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center px-3 py-1.5 bg-[#635BFF] rounded-md">
        <svg
          className="w-5 h-5 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
        </svg>
        <span className="ml-2 text-white font-semibold text-sm">Stripe</span>
      </div>
      {showDescription && (
        <div className="flex items-center text-gray-600 text-sm">
          <CreditCard className="w-4 h-4 mr-1 text-blue-500" />
          <FormattedMessage
            id="payment.gateway.stripe.secure"
            defaultMessage="Carte bancaire sécurisée"
          />
        </div>
      )}
    </div>
  );
};

export default GatewayIndicator;
