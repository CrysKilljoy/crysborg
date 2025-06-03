# Auto-Equip Feature Test Plan

## Feature Overview
When a character is created with scvmbirther (the Scvmfactory), all weapons and armor are automatically equipped.

## Changes Made
Modified `d:\FoundryVTTData\Data\systems\crysborg\module\scvm\scvmfactory.js`:

1. **createActorWithScvm()** function: Added auto-equip logic after actor creation
2. **updateActorWithScvm()** function: Added auto-equip logic after actor update (for scvmifying existing characters)

## How to Test

### Test Case 1: New Character Creation
1. Open FoundryVTT with the CY_BORG system
2. Click the "Create Scvm" button in the Actors Directory
3. Select any class from the dialog and click "Let's Go!"
4. Verify the new character has:
   - Weapons automatically equipped (visible on Violence tab)
   - Armor automatically equipped (visible on Violence tab)
   - Shield automatically equipped if present (visible on Violence tab)
   - All equipment items show as equipped (yellow shield icon on Treasures tab)

### Test Case 2: Scvmifying Existing Character
1. Create a regular character or open an existing one
2. Click the skull icon next to the class name on the character sheet
3. Select a class from the dialog and confirm
4. Verify the character has:
   - Old items removed
   - New weapons automatically equipped
   - New armor automatically equipped
   - New shield automatically equipped if present

### Expected Behavior
- Only one armor can be equipped at a time (system enforces this)
- Only one shield can be equipped at a time (system enforces this)  
- Multiple weapons can be equipped simultaneously
- Equipped items appear on the Violence tab for use in combat
- Equipped items show yellow shield icons on the Treasures tab

## Code Details
The auto-equip logic iterates through all items and calls `actor.equipItem(item)` for any item with type "weapon", "armor", or "shield". This uses the existing game system's equip functionality to ensure proper behavior.
