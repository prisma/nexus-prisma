/* eslint-disable */

const remarkGfm = require('remark-gfm')
const withNextra = require('nextra')

module.exports = withNextra('nextra-theme-docs', './theme.config.js')(withRemarkGFM())

/**
 * Use Remark GFM in MDX Webpack Loader.
 * Can be removed once shuding/nextra#184 is released.
 *
 * @returns {import('next').NextConfig}
 * @see https://github.com/shuding/nextra/pull/184/
 */
function withRemarkGFM() {
  return {
    webpack(config, options) {
      const markdownRule = config.module.rules.find((rule) => rule.test?.toString() === '/\\.mdx?$/')
      const mdxLoaderConfig = markdownRule.use.find(({ loader }) => loader === '@mdx-js/loader')
      mdxLoaderConfig.options = {
        remarkPlugins: [remarkGfm],
      }
      return config
    },
  }
}
