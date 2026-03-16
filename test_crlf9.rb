File.readlines('tvos/Podfile').each_with_index do |line, index|
  if line.include?("config.build_settings['FRAMEWORK_SEARCH_PATHS']")
    puts "#{index + 1}: #{line.strip}"
  end
end
