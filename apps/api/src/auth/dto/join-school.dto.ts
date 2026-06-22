import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

import { UserRole } from '../../common/auth.types';



const joinRoles = ['teacher', 'student', 'parent'] as const;

export type JoinRole = (typeof joinRoles)[number];



export class JoinSchoolDto {

  @IsString()

  @MinLength(4)

  schoolCode!: string;



  @IsEnum(joinRoles)

  role!: JoinRole;



  @IsString()

  @MinLength(1)

  firstName!: string;



  @IsString()

  @MinLength(1)

  lastName!: string;



  @IsString()

  @MinLength(3)

  username!: string;



  @IsEmail()

  @IsOptional()

  email?: string;



  @IsString()

  @MinLength(8)

  password!: string;



  @IsString()

  @IsOptional()

  externalRef?: string;

}

