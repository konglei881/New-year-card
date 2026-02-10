import React from 'react';
import { IconUpload } from '@arco-design/iconbox-react-m4b-next';
import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.content}>
      <IconUpload className={styles.upload} />
      <p className={styles.title3}>
        <span className={styles.title}>将照片拖到此处 或</span>
        <span className={styles.title2}>点击上传</span>
      </p>
    </div>
  );
}

export default Component;
