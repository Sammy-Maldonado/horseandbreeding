
// Define the structure of the role and scope within the UserData
export type Role = {
    roleName: string;
    scopes: string[]; // List of scope names like 'manage_horses', 'update_horses_own'
  };
  
  // Define the UserData type based on the structure of the user object
  export type UserData = {
    userId: number;
    email: string;
    mobile: string;
    iat: number;
    exp: number;
    roles: Role[]; // An array of roles the user has
  };
  