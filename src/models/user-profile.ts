
export interface UserProfile {
    id: string;
    username: string;
    email: string;
    profileName: string;
    dateOfBirth?: string;
    waterGoal?: number;
    sleepGoal?: number;
    createdAt: any;
    updatedAt: any;
    medications?: any[]; // To be defined if we manage a list here
}

    