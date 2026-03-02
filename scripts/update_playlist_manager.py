#!/usr/bin/env python3
"""
Script to complete the PlaylistManager UI integration.
Replaces the single Extract button with conditional Check/Extract buttons
and adds the availability modal at the end.
"""

import re

# Read the current file
with open('/home/aladdin/Documents/Antigravity/INDXR.AI/src/components/PlaylistManager.tsx', 'r') as f:
    content = f.read()

# Pattern 1: Replace the single Button with conditional buttons (lines 254-265)
old_button_pattern = r'''            <Button
              onClick={handleExtractClick}
              disabled={isExtracting \|\| selectedIds\.size === 0}
              className="px-8 shadow-lg shadow-primary/20"
            >
              \{isExtracting \? \(
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              \) : \(
                <CheckCircle2 className="h-4 w-4 mr-2" />
              \)\}
              \{isExtracting \? "Extracting\.\.\." : "Extract Selected"\}
            </Button>'''

new_button_section = '''            {/* Action Buttons */}
            <div className="flex gap-2">
              {!availabilityResults ? (
                <Button
                  onClick={handleCheckAvailability}
                  disabled={isCheckingAvailability || selectedIds.size === 0}
                  className="px-6 shadow-lg shadow-primary/20"
                >
                  {isCheckingAvailability ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Check Availability
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleExtractClick}
                  disabled={isExtracting || selectedIds.size === 0}
                  className="px-8 shadow-lg shadow-primary/20"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Extract Selected
                      {availabilitySummary && availabilitySummary.totalCredits > 0 && (
                        <span className="ml-2 text-xs opacity-75">
                          ({availabilitySummary.totalCredits} credits)
                        </span>
                      )}
                    </>
                  )}
                </Button>
              )}
            </div>'''

# Replace the button section
content = re.sub(old_button_pattern, new_button_section, content, flags=re.MULTILINE)

# Pattern 2: Add modal before the final closing tags
# Find the position just before the final </div> and );
modal_section = '''
      {/* Availability Check Modal */}
      {availabilityResults && availabilitySummary && (
        <PlaylistAvailabilityModal
          open={showAvailabilityModal}
          onOpenChange={setShowAvailabilityModal}
          results={availabilityResults}
          summary={availabilitySummary}
          userCredits={credits}
          onProceed={handleProceedWithExtraction}
        />
      )}
'''

# Find the last occurrence of "      )}\n    </div>\n  );"
final_pattern = r'(      \)\}\n    </div>\n  \);)'
content = re.sub(final_pattern, modal_section + r'\1', content)

# Write the updated content
with open('/home/aladdin/Documents/Antigravity/INDXR.AI/src/components/PlaylistManager.tsx', 'w') as f:
    f.write(content)

print("✅ PlaylistManager.tsx updated successfully!")
print("   - Added conditional Check Availability / Extract buttons")
print("   - Added PlaylistAvailabilityModal component")
