import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate(process.env);

const envVars: EnvVars = value;

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const envs = {
  port: envVars.PORT,
};
