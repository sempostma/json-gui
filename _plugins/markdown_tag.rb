module Jekyll
  class MarkdownTag < Liquid::Tag
    def initialize(tag_name, text, tokens)
      super
      @text = text.strip
    end
    require "kramdown"
    def render(context)
      "#{Kramdown::Document.new(File.read(File.join(Dir.pwd, @text)).sub(/---.*?---/im, '')).to_html.force_encoding(::Encoding::UTF_8)}"
    end
  end
end
Liquid::Template.register_tag('markdown', Jekyll::MarkdownTag)