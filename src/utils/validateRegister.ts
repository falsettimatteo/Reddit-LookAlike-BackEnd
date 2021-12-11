import { UsernamePasswordInput } from "../resolvers/UsernamePasswordInput";

export const validateRegister = (options: UsernamePasswordInput) => {
    if (!options.email.includes('@')) {
        return [
            {
              field: "email",
              message: "invalid email",
            },
          ];
      }
      if (options.username.includes('@')) {
        return [
            {
              field: "username",
              message: "The username can not have a @ in it",
            },
          ];
      }
      if (options.username.length <= 2) {
        return  [
            {
              field: "username",
              message: "lenght must be greater than 2",
            },
          ];
      }
  
      if (options.password.length <= 2) {
        return [
            {
              field: "password",
              message: "lenght must be greater than 2",
            },
          ];
    }
    return null;
}
