/**
 * AffiliateTools - Marketing tools for affiliates
 * UTM link builder, QR code generator, social share buttons
 */

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AffiliateToolsContent from "./AffiliateToolsContent";

const AffiliateTools: React.FC = () => {
  return (
    <DashboardLayout activeKey="affiliate">
      <AffiliateToolsContent />
    </DashboardLayout>
  );
};

export default AffiliateTools;
