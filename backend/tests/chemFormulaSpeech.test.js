import { describe, it, expect } from "vitest";
import { toSpeech, speakChemicalFormulas } from "../src/config/slidePlan.js";

describe("chemical formulas are spelled out for the narrator", () => {
  it("CO_2 in every form → C O 2", () => {
    for (const t of ["CO_2", "$CO_2$", "$CO_{2}$", "$\\mathrm{CO_2}$", "CO₂", "CO2"]) expect(toSpeech(`Plants take in ${t}.`)).toBe("Plants take in C O 2.");
  });
  it("other formulas", () => {
    expect(toSpeech("$H_2O$ and $H_2SO_4$")).toBe("H 2 O and H 2 S O 4");
    expect(toSpeech("NaHCO₃")).toBe("N A H C O 3");
    expect(toSpeech("$O_2$ gas")).toBe("O 2 gas");
  });
  it("leaves non-formulas alone", () => {
    for (const t of ["MP3", "G20", "COVID19", "Vitamin B12", "Article 370", "CO", "The A4 sheet"]) expect(speakChemicalFormulas(t)).toBe(t);
  });
});
