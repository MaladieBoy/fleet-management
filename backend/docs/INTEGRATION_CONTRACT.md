# Fleet Management Backend Integration Contract

## 1. General conventions

- Backend: Node.js, Express and MongoDB/Mongoose.
- Module communication: REST API.
- Resource identifiers: MongoDB ObjectIds.
- API errors: JSON object containing a message field.
- Shared entities must reference MongoDB document IDs, not duplicate objects.

## 2. Existing shared models

### Region
Current fields:
- name
- governorate
- address

A Region document is referenced by Vehicle.region.

The team must confirm whether Region represents a delegation
or whether a separate Delegation model will be introduced.

### Vehicle
Important fields:
- registrationNumber
- brand
- model
- type
- region
- assignedWorker
- mileage
- fuelType
- status
- statusHistory

Vehicle references:
- region -> Region
- assignedWorker -> User (external model, not yet implemented)

Vehicle statuses:
- available
- on_mission
- at_parking
- under_maintenance
- out_of_service

### FuelRecord
References:
- vehicle -> Vehicle
- worker -> User (external model)

### Maintenance
References:
- vehicle -> Vehicle

### User and employee profiles

The shared User model represents authentication accounts.

Required account fields from the team proposal:
- first_name
- last_name
- email
- username
- password (must store a secure hash, never plaintext)
- role
- status

Allowed roles:
- GD
- RD
- WORKER

Employee profiles are separate from authentication accounts.

### Worker profile
- user_id -> User
- delegation_id -> Delegation
- vehicle_id -> Vehicle (proposed; assignment relationship needs one source of truth)

### Regional Director profile
- user_id -> User
- delegation_id -> Delegation

### Geographic hierarchy

- Governorate contains multiple Delegations.
- Each Delegation belongs to one Governorate.
- Each Delegation has one Regional Director.
- Each Worker belongs to one Delegation.

### Current backend compatibility

The current backend has a Region model with:
- name
- governorate (currently stored as text)
- address

Vehicle.region references Region.

The team must agree on a migration from Region to Delegation and introduce a Governorate collection. Existing vehicle references and API compatibility must be preserved during that migration.

### Assignment relationship decision

The current Vehicle model contains assignedWorker referencing User.

The proposed Worker profile contains vehicle_id referencing Vehicle.

These represent the same relationship from opposite directions. The team must select one authoritative relationship before implementing assignment. Do not introduce both independently without synchronization rules.

## 3. Existing API endpoints

### Vehicles
- GET /api/vehicles
- GET /api/vehicles/available
- GET /api/vehicles/:id
- GET /api/vehicles/:id/history
- POST /api/vehicles
- PUT /api/vehicles/:id
- PATCH /api/vehicles/:id/status
- DELETE /api/vehicles/:id

### Fuel
- POST /api/fuel
- GET /api/fuel/:vehicleId
- GET /api/fuel/:vehicleId/consumption
- GET /api/fuel/:vehicleId/statistics
- GET /api/fuel/:vehicleId/report

### Maintenance
- POST /api/maintenance
- GET /api/maintenance/upcoming
- GET /api/maintenance/:vehicleId
- PUT /api/maintenance/:id
- DELETE /api/maintenance/:id

### Reports
- GET /api/reports/vehicles/statistics
- GET /api/reports/vehicles/pdf

## 4. Mission integration

Mission documents should reference Vehicle using its ObjectId.

Before integration, agree on:
- Mission status values.
- Which statuses mean a mission is active.
- When a vehicle becomes on_mission.
- When a vehicle becomes available again.
- Whether a vehicle can have multiple simultaneous missions.

Mission existence checks must be added to vehicle deletion protection.

## 5. Incident integration

Incident documents should reference Vehicle using its ObjectId.

Before integration, agree on:
- Incident status values.
- Incident types.
- Whether incidents can block vehicle deletion.
- How serious incidents affect vehicle status.

## 6. Access control

Authentication and authorization are not implemented yet.

The shared User account has a role field with these allowed values:

- GD: General Director
- RD: Regional Director
- WORKER: Worker

### General Director (GD)
- Can consult fleet information across the governorate.
- Can view workers across the governorate.
- Can consult statistics and download reports.
- Cannot create, modify, delete or assign vehicles.

### Regional Director (RD)
- Can manage vehicles belonging to their own delegation.
- Can assign and unassign workers belonging to their delegation.
- Can manage operational records belonging to their delegation.
- Cannot manage another delegation's resources.

### Worker (WORKER)
- Belongs to one delegation through their Worker profile.
- Can be assigned to a vehicle.
- Exact permissions remain to be defined by the team.

### Implementation requirements
- Authorization must derive the account role from the authenticated User.
- RD access must be restricted using the authenticated user's delegation.
- GD access must follow the agreed governorate scope.
- Never trust a role, user ID or delegation ID supplied directly by the client.
- Use the actual authentication middleware and User schema provided by the team.

## 7. Current deletion protection

A vehicle cannot currently be deleted when:
- Its status is on_mission.
- It has an assigned worker.
- It has fuel records.
- It has maintenance records.

Mission and Incident document checks remain pending integration.

## 8. Integration rules

- Do not create duplicate User, Region, Mission or Incident models.
- Agree on model names and collection names before importing another module.
- Use references to shared document IDs.
- Keep module-specific controllers and routes separate.
- Test cross-module operations after integration.
- Preserve the existing API contracts where possible.

## 9. Pending team decisions

### Authentication and users
- Confirm the exact Mongoose User model name and collection name.
- Confirm whether account fields use snake_case or camelCase.
- Confirm password hashing and authentication middleware.
- Confirm the User status values and account activation rules.

### Organization structure
- Confirm whether the existing Region model will become Delegation.
- Confirm the Governorate model and its relationship with Delegation.
- Decide whether GD accounts are linked to one governorate or multiple governorates.
- Confirm how each Delegation identifies its Regional Director.

### Worker and vehicle assignment
- Decide whether Worker.vehicle_id or Vehicle.assignedWorker is authoritative.
- Confirm whether a worker may have more than one assigned vehicle.
- Confirm whether a vehicle may have more than one assigned worker.
- Define assignment and unassignment rules.

### Missions and incidents
- Confirm Mission schema and active mission statuses.
- Confirm how missions update vehicle status.
- Confirm Incident schema and vehicle relationship.
- Define which incidents restrict vehicle usage or deletion.

### Permissions
- Confirm the exact permissions of WORKER accounts.
- Confirm GD and RD data visibility boundaries.
- Agree on shared authorization middleware and resource ownership checks.
