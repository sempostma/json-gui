module Jekyll
  class OneLineMarkdownTag < Liquid::Tag
    def initialize(tag_name, text, tokens)
      super
      @text = text.strip
    end
    require "kramdown"
    def render(context)
      "#{Kramdown::Document.new(File.read(File.join(Dir.pwd, @text)).sub(/---.*?---/im, '')).to_html.force_encoding(::Encoding::UTF_8).gsub(/[^\S ]+/im, '')}"
    end
  end
end
Liquid::Template.register_tag('markdown_one_line', Jekyll::OneLineMarkdownTag)