import { getHTMLElement } from "../elements.ts";
import { renderActiveTab } from "../render-tab.ts";
import type { Location } from "../types/Location.ts";
import { ALL_LOCATIONS } from "../types/Location.ts";

const LOCAL_STORAGE_KEY = "locationFilter";
export const UNSPECIFIED_LOCATION = "__unspecified__" as const;
type StoredLocation = Location | typeof UNSPECIFIED_LOCATION;

const locationDropdownButton = getHTMLElement("location-dropdown-button");
const locationDropdownMenu = getHTMLElement("location-dropdown-menu");

let availableLocations: readonly Location[] = ALL_LOCATIONS;

export function initLocationFilter(): void {
  locationDropdownButton.addEventListener("click", () => {
    locationDropdownMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    const { target } = event;
    if (
      target !== null
      && target instanceof Node
      && !locationDropdownButton.contains(target)
      && !locationDropdownMenu.contains(target)
    ) {
      locationDropdownMenu.classList.add("hidden");
    }
  });

  const selectAllBtn =
    locationDropdownMenu.querySelector<HTMLButtonElement>(".select-all-btn");
  const clearBtn =
    locationDropdownMenu.querySelector<HTMLButtonElement>(".clear-btn");

  selectAllBtn?.addEventListener("click", () => {
    setStoredLocationFilter([...availableLocations]);
    updateCheckboxes();
    renderActiveTab();
  });

  clearBtn?.addEventListener("click", () => {
    setStoredLocationFilter([]);
    updateCheckboxes();
    renderActiveTab();
  });

  renderLocationsList();
  updateCheckboxes();
}

/**
 * Provide a list of locations to the control. Accepts arbitrary strings but only keeps values that
 * match the canonical `ALL_LOCATIONS` list.
 */
export function setAvailableLocations(locations?: string[]): void {
  if (locations) {
    const normalized: Location[] = locations
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter((s) => (ALL_LOCATIONS as readonly string[]).includes(s));

    availableLocations = normalized.length > 0 ? normalized : ALL_LOCATIONS;
  } else {
    availableLocations = ALL_LOCATIONS;
  }

  renderLocationsList();
  updateCheckboxes();
}

function renderLocationsList() {
  const listContainer =
    locationDropdownMenu.querySelector<HTMLDivElement>(".locations-list");
  if (!listContainer) {
    return;
  }

  listContainer.innerHTML = "";

  for (const loc of availableLocations) {
    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.justifyContent = "space-between";

    const left = document.createElement("span");
    left.style.display = "inline-flex";
    left.style.alignItems = "center";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = loc;
    checkbox.addEventListener("change", onChange);
    left.append(checkbox);
    left.append(document.createTextNode(` ${loc}`));

    label.append(left);
    listContainer.append(label);
  }
}

function onChange() {
  const selected = getCheckboxValues();
  setStoredLocationFilter(selected);
  renderActiveTab();
}

export function getStoredLocationFilter(): string[] {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (raw === null) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const result = parsed
      .filter((v): v is string => typeof v === "string")
      .map((s) => s.trim())
      .filter(
        (s) =>
          (ALL_LOCATIONS as readonly string[]).includes(s)
          || s === UNSPECIFIED_LOCATION,
      );
    return result;
  } catch {
    return [];
  }
}

function setStoredLocationFilter(locations: readonly string[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(locations));
}

function getCheckboxValues(): string[] {
  const boxes = [
    ...locationDropdownMenu.querySelectorAll<HTMLInputElement>(
      "input[type='checkbox']",
    ),
  ];
  return boxes.filter((b) => b.checked).map((b) => b.value as StoredLocation);
}

function updateCheckboxes() {
  const stored = getStoredLocationFilter();
  const boxes = [
    ...locationDropdownMenu.querySelectorAll<HTMLInputElement>(
      "input[type='checkbox']",
    ),
  ];

  for (const cb of boxes) {
    cb.checked = stored.includes(cb.value as StoredLocation);
  }
}

export default null;
