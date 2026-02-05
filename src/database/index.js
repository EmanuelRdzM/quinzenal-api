import fs from 'fs';
import path from 'path';
import { Sequelize } from 'sequelize';
import { env } from '../shared/env.js';

const config = require('../../config/config.js')[env('NODE_ENV') || 'development'];

const sequelize = new Sequelize(
    config.database, 
    config.username, 
    config.password, 
    config
);

const db = {
  sequelize,
  Sequelize
};

export default db;
