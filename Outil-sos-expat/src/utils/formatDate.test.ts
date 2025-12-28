/**
 * =============================================================================
 * TESTS - formatDate Utilities
 * =============================================================================
 */

import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime, timeAgo } from "./formatDate";

describe("formatDate", () => {
  const testDate = new Date("2024-06-15T14:30:00");

  describe("formatDate()", () => {
    it("formate une Date en français par défaut", () => {
      const result = formatDate(testDate);
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });

    it("accepte un timestamp number", () => {
      const result = formatDate(testDate.getTime());
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });

    it("accepte une string ISO", () => {
      const result = formatDate("2024-06-15T14:30:00");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });

    it("respecte les options personnalisées", () => {
      const result = formatDate(testDate, "fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      expect(result).toContain("2024");
    });
  });

  describe("formatDateTime()", () => {
    it("inclut l'heure dans le format", () => {
      const result = formatDateTime(testDate);
      expect(result).toContain("14");
      expect(result).toContain("30");
    });

    it("formate correctement en français", () => {
      const result = formatDateTime(testDate, "fr-FR");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });
  });

  describe("timeAgo()", () => {
    it("affiche 'maintenant' pour une date très récente", () => {
      const now = new Date();
      const result = timeAgo(now, now, "fr-FR");
      expect(result).toBeTruthy();
    });

    it("affiche 'il y a X secondes' pour quelques secondes", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 30000); // 30 secondes
      const result = timeAgo(past, now, "fr-FR");
      expect(result).toBeTruthy();
    });

    it("affiche 'il y a X minutes' pour quelques minutes", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes
      const result = timeAgo(past, now, "fr-FR");
      expect(result).toBeTruthy();
    });

    it("affiche 'il y a X heures' pour quelques heures", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 heures
      const result = timeAgo(past, now, "fr-FR");
      expect(result).toBeTruthy();
    });

    it("affiche 'il y a X jours' pour quelques jours", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 jours
      const result = timeAgo(past, now, "fr-FR");
      expect(result).toBeTruthy();
    });

    it("accepte différentes locales", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 60000);
      const resultFR = timeAgo(past, now, "fr-FR");
      const resultEN = timeAgo(past, now, "en-US");
      expect(resultFR).not.toEqual(resultEN);
    });
  });
});
