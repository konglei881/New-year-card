import React from 'react';
import { Button } from '@m4b-design/components';
import { IconPlusCircle, IconAiFeature, IconDownload } from '@arco-design/iconbox-react-m4b-next';
import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame7}>
      <div className={styles.frame2117128702}>
        <img src="../image/mlara2r1-e0924os.svg" className={styles.frame} />
        <p className={styles.text}>春节个人专属祝福卡</p>
      </div>
      <div className={styles.frame2117128699}>
        <div className={styles.frame52}>
          <div className={styles.frame2117128701}>
            <div className={styles.frame3}>
              <p className={styles.tertiaryTitle2}>您的性別</p>
              <div className={styles.frame2}>
                <p className={styles.text2}>女性</p>
                <div className={styles.trailing}>
                  <p className={styles.kg} />
                  <img
                    src="../image/mlara2r1-mrgifzz.svg"
                    className={styles.down}
                  />
                </div>
              </div>
            </div>
            <div className={styles.frame3}>
              <p className={styles.tertiaryTitle2}>祝福类型</p>
              <div className={styles.frame2}>
                <p className={styles.text2}>财运</p>
                <div className={styles.trailing}>
                  <p className={styles.kg} />
                  <img
                    src="../image/mlara2r1-mrgifzz.svg"
                    className={styles.down}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className={styles.frame4}>
            <p className={styles.text3}>生成您的AI形象</p>
            <Button
              icon={<IconPlusCircle />}
              type="primary"
              size="default"
              className={styles.lightButton}
            >
              点击选择上传照片
            </Button>
          </div>
          <div className={styles.frame32}>
            <div className={styles.frame2117128703}>
              <p className={styles.text3}>填写祝福语</p>
              <div className={styles.frame5}>
                <p className={styles.text4}>
                  请输入字幕内容,支持多行文本.../n/n例如:\n别妙\n我在给自己写的网站呢
                </p>
                <p className={styles.kg} />
              </div>
            </div>
            <div className={styles.frame2117128694}>
              <Button
                icon={<IconAiFeature />}
                type="primary"
                size="default"
                className={styles.lightButton2}
              >
                生成祝福卡
              </Button>
              <Button
                icon={<IconDownload />}
                type="default"
                size="default"
                className={styles.lightButton2}
              >
                保存图片
              </Button>
            </div>
          </div>
        </div>
        <div className={styles.frame2117128697}>
          <img src="../image/mlara2r1-zdcoatg.svg" className={styles.frame6} />
          <div className={styles.frame2117128696}>
            <p className={styles.text5}>祝福卡生成区</p>
            <p className={styles.text6}>请先上传照片，然后输入字幕内容</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
