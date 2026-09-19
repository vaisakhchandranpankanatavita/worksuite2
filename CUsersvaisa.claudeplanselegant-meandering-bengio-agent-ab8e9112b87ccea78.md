 # Implementation Plan: Planned Preventive Maintenance (PPM) System for Assets

## Overview
Implement a system to track and complete preventive maintenance for IT assets, including automated date calculation, dashboard monitoring, and a streamlined completion workflow.

## 1. Store Updates ()

### Date Calculation Helper
Add a helper function to handle frequency-based date offsets.
- **Logic**:
  -  -> +1 month
  -  -> +3 months
  -  -> +6 months
  -  -> +1 year

### New Action: 
Implement the  action in the  store.
- **Implementation Steps**:
  1. Find the asset by uid=197609(vaisa) gid=197609 groups=197609.
  2. Update  to today's date (using  constant).
  3. Calculate  based on the asset's  and today's date.
  4. Update the asset in the  state.
  5. Create a log entry using .
  6. Trigger a success toast: .

## 2. Monitoring & Dashboard ()

### New Stat Tile: 'Maintenance Due'
- **Logic**: Count assets where  is present and $\le$ .
- **UI**: Add a  in the stat tiles grid.
- **Icon**: Use  or  from .

### Upcoming Maintenance List (Optional/Bonus)
- Add a small list showing the next 5 assets due for maintenance.

## 3. Inventory List Improvements ()

### 'Due for Maintenance' Filter
- **Modification**: Update the status filter state to support a special  value.
- **Filter Logic**: In the  useMemo, if , filter assets where  $\le$ .
- **UI**: Add a filter button for "Due for Maintenance" alongside existing status buttons.

### Overdue Badges
- **UI**: In both grid and list views, if an asset's  $\le$ , render a  with  and text "Overdue".

## 4. Asset Detail View ()

### Maintenance Action Button
- **UI**: In the "Planned Preventive Maintenance" section, add a "Complete Maintenance" button.
- **Functionality**:
  - Call  on click.
  - Disable the button if  is not set.
- **Placement**: Next to the "Edit" button in the maintenance section header.

## Critical Files for Implementation
- 
- 
- 
- 

