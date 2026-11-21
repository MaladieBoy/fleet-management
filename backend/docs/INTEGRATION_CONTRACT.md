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

### User integration
The User model does not exist in this backend yet.

Existing references expecting User:
- Vehicle.assignedWorker
- FuelRecord.worker
- Vehicle.statusHistory.changedBy

The actual User schema, role names, and region/delegation relationship
must be agreed with the team before implementing assignment and permissions.

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

Required permissions from the project requirements:

Regional Director:
- Manage vehicles in their own delegation.
- Assign and unassign workers.
- Manage related operational records.

General Director:
- Consult fleet-wide information.
- View reports and download PDFs.
- Cannot create, modify, delete or assign vehicles.

The implementation must use the actual authentication and User schema
provided by the team.

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

- Confirm Region versus Delegation responsibilities.
- Confirm User schema, roles and delegation relationship.
- Confirm Mission schema and active status values.
- Confirm Incident schema and vehicle relationship.
- Agree on authentication middleware and permissions.
