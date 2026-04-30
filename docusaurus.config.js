// @ts-check
const { themes: prismThemes } = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Power Pages Lab',
  tagline: 'Hands-on labs and guides for Microsoft Power Pages',
  favicon: 'img/favicon.ico',

  url: 'https://neerajnandwana-msft.github.io',
  baseUrl: '/powerpages-lab/',

  organizationName: 'neerajnandwana-msft',
  projectName: 'powerpages-lab',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/neerajnandwana-msft/powerpages-lab/tree/main/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/neerajnandwana-msft/powerpages-lab/tree/main/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/social-card.jpg',
      navbar: {
        title: 'Power Pages Lab',
        logo: {
          alt: 'Power Pages Lab Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Labs',
          },
          { to: '/blog', label: 'Blog', position: 'left' },
          {
            href: 'https://github.com/neerajnandwana-msft/powerpages-lab',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Labs',
            items: [
              {
                label: 'Getting Started',
                to: '/docs/intro',
              },
            ],
          },
          {
            title: 'Resources',
            items: [
              {
                label: 'Power Pages Docs',
                href: 'https://learn.microsoft.com/power-pages/',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/neerajnandwana-msft/powerpages-lab',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Neeraj Nandwana. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

module.exports = config;
