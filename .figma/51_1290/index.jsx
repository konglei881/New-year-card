import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.autoWrapper}>
        <img src="../image/mlexr2od-bdsnke0.svg" className={styles.features4} />
        <div className={styles.rectangle2}>
          <p className={styles.text}>照片区</p>
        </div>
        <div className={styles.group1}>
          <p className={styles.a2026}>2026</p>
          <p className={styles.happyNewYear}>Happy New Year</p>
        </div>
      </div>
      <p className={styles.text2}>
        祝福语位置
        <br />
        祝福语位置
      </p>
    </div>
  );
}

export default Component;
