// @ts-ignore - module-alias types not available
import moduleAlias from 'module-alias';
import * as path from 'path';

// Register module aliases for production
moduleAlias.addAliases({
  '@core': path.join(__dirname, 'core'),
  '@feature': path.join(__dirname, 'feature'),
  '@utils': path.join(__dirname, 'utils'),
  '@types': path.join(__dirname, 'types'),
});
