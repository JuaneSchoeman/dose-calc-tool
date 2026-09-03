# Category background tiles

Drop your seamless pattern tiles in this folder using the exact filenames
below (these are referenced directly by `AppearanceContext.jsx`). PNG is
assumed - if you use a different format, update the extension in
`CATEGORY_TILE_SLUGS` / `tileUrlFor` in
`frontend/src/context/AppearanceContext.jsx` to match.

| Clinical category        | Expected filename                  |
|---------------------------|-------------------------------------|
| General                   | `general.png`                       |
| Adult Medical/Surgical    | `adult-medical-surgical.png`        |
| Oncology                  | `oncology.png`                      |
| Outpatient/Ambulatory     | `outpatient-ambulatory.png`         |
| Intensive Care            | `intensive-care.png`                |
| Emergency Department      | `emergency-department.png`          |
| Paediatrics               | `paediatrics.png`                   |
| Pharmacy                  | `pharmacy.png`                      |

If a tile is missing for a category, the app falls back to `general.png`
rather than breaking - so it's fine to add these gradually. Keep tiles
reasonably small (under ~50-100 KB each) since they're loaded as a
repeating `background-image` and don't need to be large to tile well.
