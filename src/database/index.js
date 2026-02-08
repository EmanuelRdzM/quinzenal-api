import fs from 'fs';
import path from 'path';
import { Sequelize } from 'sequelize';
import { env } from '../shared/env.js';
import config  from '../../config/config.js';

const envMode = env('NODE_ENV') || 'development';
const dbConfig = config[envMode];
//const config = require('../../config/config.js')[env('NODE_ENV') || 'development'];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

export default sequelize;
