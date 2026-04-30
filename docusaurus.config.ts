import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import rehypeExternalLinks from 'rehype-external-links';

const config: Config = {
  title: 'Agentic Site Authoring',
  tagline: 'A self-paced lab track for Power Pages SPA sites',
  favicon: 'img/power-pages-logo.svg',

  url: 'https://neerajnandwana-msft.github.io',
  baseUrl: '/powerpages-lab/',

  organizationName: 'neerajnandwana-msft',
  projectName: 'powerpages-lab',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

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
      title: 'Agentic Site Authoring',
      logo: {
        alt: 'Microsoft Power Pages',
        src: 'img/power-pages-logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'labSidebar',
          position: 'left',
          label: 'Lab Guide',
        },
        {
          href: 'https://github.com/neerajnandwana-msft/powerpages-lab',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} Neeraj Nandwana — Agentic Site Authoring lab track.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'yaml', 'typescript', 'powershell'],
    },
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
