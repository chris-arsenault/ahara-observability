const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/module.ts",
  devtool: "source-map",
  externals: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    /^@grafana\/data/i,
    /^@grafana\/runtime/i,
    /^@grafana\/ui/i,
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: "ts-loader",
      },
    ],
  },
  output: {
    clean: true,
    filename: "module.js",
    library: { type: "amd" },
    path: path.resolve(__dirname, "dist"),
    publicPath: "public/plugins/ahara-source-panel/",
    uniqueName: "ahara-source-panel",
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "src/plugin.json", to: "plugin.json" },
        { from: "README.md", to: "README.md" },
      ],
    }),
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
};
