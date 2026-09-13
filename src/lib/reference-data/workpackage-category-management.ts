export interface WorkPackageCategoryScope {
  systemhouseId: string;
  systemhouseName: string;
}

/** JSON-sicherer Ausschnitt eines Reference Values für die Management-ServerFn. */
export interface WorkPackageCategoryManagementValue {
  id: string;
  key: string;
  label: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  validTo: string | null;
  systemhouseId: string;
}

export interface WorkPackageCategoryManagementPayload {
  scopes: WorkPackageCategoryScope[];
  selectedSystemhouseId: string | null;
  values: WorkPackageCategoryManagementValue[];
}

export interface CreateWorkPackageCategoryInput {
  systemhouseId: string;
  key: string;
  label: string;
  description: string;
  sortOrder: number;
}

export interface UpdateWorkPackageCategoryInput {
  systemhouseId: string;
  valueId: string;
  label: string;
  description: string;
  sortOrder: number;
}

export interface DeactivateWorkPackageCategoryInput {
  systemhouseId: string;
  valueId: string;
}

export interface WorkPackageCategoryManagementRepository {
  listManageableScopes(userId: string): Promise<WorkPackageCategoryScope[]>;
  listValues(systemhouseId: string): Promise<WorkPackageCategoryManagementValue[]>;
  createValue(input: CreateWorkPackageCategoryInput, actorId: string): Promise<void>;
  updateValue(input: UpdateWorkPackageCategoryInput, actorId: string): Promise<void>;
  deactivateValue(input: DeactivateWorkPackageCategoryInput, actorId: string): Promise<void>;
}
