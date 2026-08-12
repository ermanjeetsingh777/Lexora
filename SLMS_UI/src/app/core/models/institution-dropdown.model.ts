export interface KeyValueResponse {
    key: string;
    value: string;
}

export interface LibraryDropdownResponse extends KeyValueResponse {
    plans: KeyValueResponse[]
}

export interface BranchDropdownResponse extends KeyValueResponse {
    libraries: LibraryDropdownResponse[];
}

export interface InstitutionDropdownResponse extends KeyValueResponse {
    branches: BranchDropdownResponse[];
}

export interface PlanDropdownResponse extends KeyValueResponse {
    price: number;
}

export interface PlanResponse {    
    id : string,
    institutionId: string,
    branchId : string
    libraryId : string,
    name : string,
    description : string,
    price : number,
    durationInDays: number,
    maxSeats : number,
    isActive : boolean,
    createdAtUtc : Date
}