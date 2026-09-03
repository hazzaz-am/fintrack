## ADDED Requirements

### Requirement: Category Update
The system SHALL allow a user to rename their own category, change its icon, and change its parent category, scoped to categories they own.

#### Scenario: Rename a category
- **WHEN** a user updates the name of a category they own
- **THEN** the system saves the new name, and it is reflected wherever the category is referenced (transaction lists, breakdown charts)

#### Scenario: Re-parent a category
- **WHEN** a user sets a category's parent to a different category they own
- **THEN** the system updates the parent relationship

#### Scenario: Category cannot be its own parent
- **WHEN** a user attempts to set a category's `parentCategoryId` to its own id
- **THEN** the system rejects the update with a validation error

#### Scenario: Cannot update another user's category
- **WHEN** a user attempts to update a category ID belonging to a different user
- **THEN** the system rejects the request as not found

### Requirement: Category Deletion
The system SHALL allow a user to delete their own category, but SHALL reject deletion of a category still referenced by any transaction (every INCOME/EXPENSE transaction requires a category, enforced at the database level — a referenced category cannot be orphaned). Deleting a category with children SHALL NOT delete the children; their parent reference SHALL become unset instead.

#### Scenario: Delete a category with no references
- **WHEN** a user deletes a category they own that no transaction references
- **THEN** the category is removed and no longer appears in their category list

#### Scenario: Attempt to delete a category referenced by transactions
- **WHEN** a user attempts to delete a category that one or more of their transactions reference
- **THEN** the system rejects the deletion with an error naming how many transactions reference it, and neither the category nor those transactions are changed

#### Scenario: Delete a category after its transactions are reassigned
- **WHEN** a user reassigns every transaction referencing a category to a different category, then deletes the now-unreferenced category
- **THEN** the category is removed

#### Scenario: Delete a category with children
- **WHEN** a user deletes a category that one or more other categories reference as their parent
- **THEN** the category is removed, and the child categories remain, with their parent reference unset

#### Scenario: Cannot delete another user's category
- **WHEN** a user attempts to delete a category ID belonging to a different user
- **THEN** the system rejects the request as not found
