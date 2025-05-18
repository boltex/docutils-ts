import baseSettings from './baseSettings.js';
import { Settings } from './index.js';

export function getDefaultSettings(): Settings {
    // Create a new object by spreading baseSettings.
    // Then, specifically override dumpPseudoXml.
    return {
        ...baseSettings,
        // If baseSettings.dumpPseudoXml is null, set it to undefined.
        // Otherwise, keep its original value (which could be a string or already undefined).
        dumpPseudoXml: baseSettings.dumpPseudoXml === null ? undefined : baseSettings.dumpPseudoXml,
    };
}
