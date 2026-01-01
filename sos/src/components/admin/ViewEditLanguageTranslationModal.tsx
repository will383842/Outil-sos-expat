import React, { useState } from "react";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import { SupportedLanguage } from "@/services/providerTranslationService";
import { Loader2 } from "lucide-react";

type Mode = "view" | "edit";

type Props = {
  isOpen: boolean;
  mode: Mode;
  lang: SupportedLanguage;
  initialData: { bio?: string; specialties?: string[]; motivation?: string } | null;
  onClose: () => void;
  onSave?: (data: { bio?: string; specialties?: string[]; motivation?: string }) => Promise<void> | void;
};

const ViewEditLanguageTranslationModal: React.FC<Props> = ({
  isOpen,
  mode,
  lang: _lang,
  initialData,
  onClose,
  onSave,
}) => {
  const disabledBase = mode === "view";
  const [bio, setBio] = useState<string>(initialData?.bio || "");
  const [motivation, setMotivation] = useState<string>(initialData?.motivation || "");
  const [specialties, setSpecialties] = useState<string[]>(
    Array.isArray(initialData?.specialties) ? (initialData!.specialties as string[]) : []
  );
  const [tagInput, setTagInput] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const disabled = disabledBase || saving;

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    if (!specialties.includes(v)) setSpecialties((s) => [...s, v]);
    setTagInput("");
  };
  const removeTag = (v: string) => setSpecialties((s) => s.filter((x) => x !== v));

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave({
        bio,
        specialties,
        motivation,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={`${mode === "view" ? "View" : "Edit"} Language Translation`}
    >
      <div className="p-3 space-y-4">
        {/* Bio */}
        <div>
          <div className="text-sm font-medium mb-1">Bio</div>
          <textarea
            className="w-full border rounded p-2 text-sm"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Enter bio..."
            disabled={disabled}
          />
        </div>

        {/* Specialties */}
        <div>
          <div className="text-sm font-medium mb-1">Specialties</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {specialties.map((sp) => (
              <span key={sp} className="inline-flex items-center gap-2 bg-gray-100 border rounded px-2 py-1 text-xs">
                {sp}
                {!disabledBase && !saving && (
                  <button
                    type="button"
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => removeTag(sp)}
                    aria-label={`remove ${sp}`}
                    title="Remove"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {!disabledBase && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="border rounded px-2 py-1 text-sm flex-1"
                placeholder="Add specialty and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                disabled={saving}
              />
              <Button variant="secondary" onClick={addTag} disabled={saving}>
                Add
              </Button>
            </div>
          )}
        </div>

        {/* Motivation */}
        <div>
          <div className="text-sm font-medium mb-1">Motivation</div>
          <textarea
            className="w-full border rounded p-2 text-sm"
            rows={4}
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            placeholder="Enter motivation..."
            disabled={disabled}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {mode === "edit" && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </span>
              ) : (
                "Save"
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ViewEditLanguageTranslationModal;
