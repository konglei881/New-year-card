import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.content}>
      <div className={styles.item2}>
        <p className={styles.item}>女性</p>
      </div>
      <div className={styles.item4}>
        <p className={styles.item3}>男性</p>
      </div>
    </div>
  );
}

export default Component;
