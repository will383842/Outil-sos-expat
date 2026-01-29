/**
 * ShareMessageSelector
 *
 * Pre-written share messages by language with copy/share functionality.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, MessageSquare } from "lucide-react";
import { useViralKit } from "@/hooks/useViralKit";
import { useTranslation } from "@/hooks/useTranslation";

interface ShareMessageSelectorProps {
  showShareButtons?: boolean;
}

export function ShareMessageSelector({
  showShareButtons = true,
}: ShareMessageSelectorProps) {
  const { t } = useTranslation();
  const {
    shareMessages,
    selectedLanguage,
    setSelectedLanguage,
    selectedMessage,
    selectMessage,
    copyMessage,
    copied,
    shareOn,
  } = useViralKit();

  const messages = shareMessages[selectedLanguage] || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {t("chatter.referrals.shareMessages")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Language tabs */}
        <Tabs
          value={selectedLanguage}
          onValueChange={(v: string) => setSelectedLanguage(v as "fr" | "en")}
        >
          <TabsList className="grid grid-cols-2 w-40">
            <TabsTrigger value="fr">Francais</TabsTrigger>
            <TabsTrigger value="en">English</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Message list */}
        <div className="space-y-2">
          {messages.map((message, index) => {
            const isSelected =
              message === selectedMessage ||
              messages.indexOf(selectedMessage) === index;

            return (
              <div
                key={index}
                onClick={() => selectMessage(index)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="text-sm">{message}</p>

                {isSelected && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant={copied ? "default" : "outline"}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyMessage(message);
                      }}
                      className="gap-1"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3" />
                          {t("common.copied")}
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          {t("common.copy")}
                        </>
                      )}
                    </Button>

                    {showShareButtons && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            shareOn("whatsapp", message);
                          }}
                          className="bg-[#25D366]/10 border-[#25D366] text-[#25D366]"
                        >
                          WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            shareOn("telegram", message);
                          }}
                          className="bg-[#0088cc]/10 border-[#0088cc] text-[#0088cc]"
                        >
                          Telegram
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tip */}
        <p className="text-xs text-gray-500">
          {t("chatter.referrals.messagesTip")}
        </p>
      </CardContent>
    </Card>
  );
}
