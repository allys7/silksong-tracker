import bossesJSON from "../data/bosses.json" with { type: "json" };
import completionJSON from "../data/completion.json" with { type: "json" };
import essentialsJSON from "../data/essentials.json" with { type: "json" };
import journalJSON from "../data/journal.json" with { type: "json" };
import mainJSON from "../data/main.json" with { type: "json" };
import miniBossesJSON from "../data/mini-bosses.json" with { type: "json" };
import scenesJSON from "../data/scenes.json" with { type: "json" };
import wishesJSON from "../data/wishes.json" with { type: "json" };
import { getHTMLElement } from "../elements.ts";
import { renderActiveTab } from "../render-tab.ts";
import type { Category } from "../types/Category.ts";
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

  // Add a special "Unspecified" option (items that do not have a `locations` property on the item
  // JSON). This is not part of `ALL_LOCATIONS`.
  const counts = computeLocationCounts();

  const unspecifiedLabel = document.createElement("label");
  unspecifiedLabel.style.display = "flex";
  unspecifiedLabel.style.justifyContent = "space-between";

  const unspecifiedLeft = document.createElement("span");
  const unspecifiedCheckbox = document.createElement("input");
  unspecifiedCheckbox.type = "checkbox";
  unspecifiedCheckbox.value = UNSPECIFIED_LOCATION;
  unspecifiedCheckbox.addEventListener("change", onChange);
  unspecifiedLeft.append(unspecifiedCheckbox);
  unspecifiedLeft.append(document.createTextNode(" No location"));

  const unspecifiedCount = document.createElement("span");
  unspecifiedCount.textContent = String(counts.unspecified ?? 0);

  unspecifiedLabel.append(unspecifiedLeft);
  unspecifiedLabel.append(unspecifiedCount);
  listContainer.append(unspecifiedLabel);

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

    const countSpan = document.createElement("span");
    countSpan.textContent = String(counts.locations.get(loc) ?? 0);

    label.append(left);
    label.append(countSpan);
    listContainer.append(label);
  }
}

function computeLocationCounts(): {
  locations: Map<string, number>;
  unspecified: number;
} {
  const allCategories: Array<{ categories: Category[] }> = [
    { categories: mainJSON.categories as Category[] },
    { categories: essentialsJSON.categories as Category[] },
    { categories: bossesJSON.categories as Category[] },
    { categories: miniBossesJSON.categories as Category[] },
    { categories: completionJSON.categories as Category[] },
    { categories: wishesJSON.categories as Category[] },
    { categories: journalJSON.categories as Category[] },
    { categories: scenesJSON.categories as Category[] },
  ];

  const map = new Map<string, number>();
  let unspecified = 0;

  for (const group of allCategories) {
    for (const category of group.categories) {
      const categoryLocations =
        Array.isArray((category as any).locations)
        && (category as any).locations.length > 0
          ? ((category as any).locations as string[])
          : typeof category.label === "string"
            ? [category.label]
            : [];

      for (const item of category.items) {
        const itemHasLocations =
          Array.isArray((item as any).locations)
          && (item as any).locations.length > 0;

        if (!Array.isArray((item as any).locations)) {
          // Item has no explicit `locations` property — count toward unspecified
          unspecified++;
        }

        const itemLocations = itemHasLocations
          ? ((item as any).locations as string[])
          : categoryLocations;

        if (!Array.isArray(itemLocations) || itemLocations.length === 0) {
          continue;
        }

        for (const l of itemLocations) {
          if (typeof l !== "string") {
            continue;
          }
          map.set(l, (map.get(l) ?? 0) + 1);
        }
      }
    }
  }

  return { locations: map, unspecified };
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
