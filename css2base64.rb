#!/usr/bin/env ruby

require 'base64'

def generate_base64(image)
  # hardcoded png MIME type.
  "data:image/png;base64,#{Base64.encode64(open(image).read).gsub("\n", '')}"
end

def transform_css(css, images)
  re = Regexp.new("url\\((#{images.join('|')})\\)")
  base64s = Hash.new { |h, k| h[k] = generate_base64(k) }
  open(css) do |f|
    f.each do |css_line|
      if match = re.match(css_line)
        puts css_line.gsub(match[1], base64s[match[1]])
      else
        puts css_line
      end
    end
  end
end


if __FILE__ == $0
  if ARGV.size < 2
    puts "Syntax: css2base64 [cssfile] [image1.png] ([image2.png] ...)"
  else
    css, *images = ARGV
    transform_css(css, images)
  end
end