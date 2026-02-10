import React from 'react';
import { IconDelete } from '@arco-design/iconbox-react-m4b-next';
import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.hover}>
      <IconDelete className={styles.delete} />
    </div>
  );
}

export default Component;
