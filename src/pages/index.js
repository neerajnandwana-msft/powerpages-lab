import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/intro">
            Start the Labs →
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <div className="container margin-vert--xl">
          <div className="row">
            <div className="col col--4">
              <div className="card padding--lg">
                <h3>🧪 Hands-on Labs</h3>
                <p>Step-by-step labs that walk you through real Power Pages scenarios from start to finish.</p>
              </div>
            </div>
            <div className="col col--4">
              <div className="card padding--lg">
                <h3>📋 Best Practices</h3>
                <p>Patterns and guidance collected from production Power Pages deployments.</p>
              </div>
            </div>
            <div className="col col--4">
              <div className="card padding--lg">
                <h3>💡 Code Samples</h3>
                <p>Ready-to-use Liquid, JavaScript, and configuration snippets you can drop straight into your site.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
