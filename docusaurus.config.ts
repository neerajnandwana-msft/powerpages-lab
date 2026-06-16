import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import rehypeExternalLinks from 'rehype-external-links';

const config: Config = {
  title: 'Power Pages',
  tagline: 'A self-paced lab track for Power Pages SPA sites',

  url: 'https://neerajnandwana-msft.github.io',
  baseUrl: '/powerpages-lab/',

  organizationName: 'neerajnandwana-msft',
  projectName: 'powerpages-lab',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',

  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          numberPrefixParser: false,
          editUrl: 'https://github.com/neerajnandwana-msft/powerpages-lab/tree/main/',
          rehypePlugins: [
            [
              rehypeExternalLinks,
              {
                target: '_blank',
                rel: ['noopener', 'noreferrer'],
              },
            ],
          ],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'Power Pages',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'labSidebar',
          position: 'left',
          label: 'Agentic Site Authoring Lab guide',
        },
        {
          href: 'pathname:///pdf/lab-guide.pdf',
          label: 'Download PDF',
          position: 'right',
          target: '_blank',
          rel: ['noopener'],
        },
        {
          href: 'https://github.com/neerajnandwana-msft/powerpages-lab',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
        },
      ],
    },
    image: 'img/user-journey.png',
    metadata: [
      {
        name: 'description',
        content:
          'A self-paced lab track for building Microsoft Power Pages SPA sites with AI-assisted development and ALM practices.',
      },
      {
        property: 'og:title',
        content: 'Power Pages Agentic Site Authoring lab guide',
      },
      {
        property: 'og:description',
        content:
          'Build a Power Pages SPA site, connect it to Dataverse, secure it, and promote it across environments.',
      },
    ],
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['bash', 'json', 'yaml', 'typescript', 'powershell'],
    },
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
