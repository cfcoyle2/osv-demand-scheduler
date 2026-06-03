$ErrorActionPreference = 'Stop'

$workspace = 'c:\Users\Chris.Coyle\OneDrive - Shell\VS Code'
$outputPath = Join-Path $workspace 'Library\03_Presentations\Sparta_EV_Runs\Sparta_EV_Manager_Brief_Shell_Branded.pptx'

function Convert-HexColor {
    param(
        [Parameter(Mandatory)]
        [string]$Hex
    )

    $clean = $Hex.TrimStart('#')
    if ($clean.Length -ne 6) {
        throw "Expected a 6-digit hex color, got '$Hex'."
    }

    $red = [Convert]::ToInt32($clean.Substring(0, 2), 16)
    $green = [Convert]::ToInt32($clean.Substring(2, 2), 16)
    $blue = [Convert]::ToInt32($clean.Substring(4, 2), 16)
    return $red + ($green -shl 8) + ($blue -shl 16)
}

$brand = @{
    ShellRed = Convert-HexColor '#DD1D21'
    ShellYellow = Convert-HexColor '#FBCE07'
    ShellNavy = Convert-HexColor '#112B45'
    Ink = Convert-HexColor '#1F2933'
    Canvas = Convert-HexColor '#FFFDF7'
    WarmWhite = Convert-HexColor '#FFF7D6'
    Sand = Convert-HexColor '#F3E7B3'
    SoftGray = Convert-HexColor '#F5F5F0'
}

function Add-TitleBox {
    param(
        $Slide,
        [string]$Text,
        [float]$Left,
        [float]$Top,
        [float]$Width,
        [float]$Height,
        [int]$FontSize = 28,
        [string]$FontName = 'Aptos Display',
        [int]$Color = 0,
        [int]$Bold = -1
    )

    $shape = $Slide.Shapes.AddTextbox(1, $Left, $Top, $Width, $Height)
    $textRange = $shape.TextFrame.TextRange
    $textRange.Text = $Text
    $textRange.Font.Name = $FontName
    $textRange.Font.Size = $FontSize
    $textRange.Font.Bold = $Bold
    $textRange.Font.Color.RGB = $Color
    $shape.TextFrame.AutoSize = 1
    return $shape
}

function Add-BrandTag {
    param(
        $Slide,
        [float]$Left,
        [float]$Top,
        [float]$Width = 112,
        [float]$Height = 28,
        [string]$Text = 'SHELL'
    )

    $shape = $Slide.Shapes.AddShape(1, $Left, $Top, $Width, $Height)
    $shape.Fill.ForeColor.RGB = $brand.ShellRed
    $shape.Line.Visible = 0
    $textRange = $shape.TextFrame.TextRange
    $textRange.Text = $Text
    $textRange.Font.Name = 'Aptos'
    $textRange.Font.Size = 12
    $textRange.Font.Bold = -1
    $textRange.Font.Color.RGB = $brand.WarmWhite
    $shape.TextFrame.MarginLeft = 10
    $shape.TextFrame.MarginRight = 10
    $shape.TextFrame.MarginTop = 6
    $shape.TextFrame.MarginBottom = 4
    return $shape
}

function Add-FooterStripe {
    param(
        $Slide,
        [string]$FooterText = 'Shell GoA Supply Chain'
    )

    $stripe = $Slide.Shapes.AddShape(1, 0, 510, 960, 30)
    $stripe.Fill.ForeColor.RGB = $brand.ShellNavy
    $stripe.Line.Visible = 0

    Add-TitleBox -Slide $Slide -Text $FooterText -Left 34 -Top 516 -Width 420 -Height 18 -FontSize 11 -FontName 'Aptos' -Color $brand.WarmWhite -Bold 0 | Out-Null
    return $stripe
}

function Add-BulletsBox {
    param(
        $Slide,
        [string[]]$Bullets,
        [float]$Left,
        [float]$Top,
        [float]$Width,
        [float]$Height,
        [int]$FontSize = 20,
        [string]$FontName = 'Aptos',
        [int]$Color = 0x2E2A24
    )

    $shape = $Slide.Shapes.AddTextbox(1, $Left, $Top, $Width, $Height)
    $textRange = $shape.TextFrame.TextRange
    $textRange.Text = ($Bullets -join "`r")
    $textRange.Font.Name = $FontName
    $textRange.Font.Size = $FontSize
    $textRange.Font.Color.RGB = $Color
    $shape.TextFrame.WordWrap = -1
    $shape.TextFrame.AutoSize = 0
    $shape.TextFrame.MarginLeft = 8
    $shape.TextFrame.MarginRight = 8
    $shape.TextFrame.MarginTop = 6
    $shape.TextFrame.MarginBottom = 6

    for ($i = 1; $i -le $textRange.Paragraphs().Count; $i++) {
        $paragraph = $textRange.Paragraphs($i)
        $paragraph.ParagraphFormat.Bullet.Visible = -1
        $paragraph.ParagraphFormat.Bullet.Character = 8226
        $paragraph.ParagraphFormat.SpaceAfter = 8
        $paragraph.Font.Size = $FontSize
        $paragraph.Font.Name = $FontName
        $paragraph.Font.Color.RGB = $Color
    }

    return $shape
}

function Add-NoteBox {
    param(
        $Slide,
        [string]$Text,
        [float]$Left,
        [float]$Top,
        [float]$Width,
        [float]$Height
    )

    $shape = $Slide.Shapes.AddShape(1, $Left, $Top, $Width, $Height)
    $shape.Fill.ForeColor.RGB = $brand.WarmWhite
    $shape.Line.Visible = 0
    $textRange = $shape.TextFrame.TextRange
    $textRange.Text = $Text
    $textRange.Font.Name = 'Aptos'
    $textRange.Font.Size = 12
    $textRange.Font.Color.RGB = $brand.Ink
    $shape.TextFrame.WordWrap = -1
    $shape.TextFrame.MarginLeft = 10
    $shape.TextFrame.MarginRight = 10
    $shape.TextFrame.MarginTop = 8
    $shape.TextFrame.MarginBottom = 8
    return $shape
}

function New-ContentSlide {
    param(
        $Presentation,
        [int]$Index,
        [string]$Title,
        [string[]]$Bullets,
        [string]$Note
    )

    $slide = $Presentation.Slides.Add($Index, 12)
    $slide.FollowMasterBackground = 0
    $slide.Background.Fill.ForeColor.RGB = $brand.Canvas

    $banner = $slide.Shapes.AddShape(1, 0, 0, 960, 64)
    $banner.Fill.ForeColor.RGB = $brand.ShellYellow
    $banner.Line.Visible = 0

    $accent = $slide.Shapes.AddShape(1, 0, 64, 960, 8)
    $accent.Fill.ForeColor.RGB = $brand.ShellRed
    $accent.Line.Visible = 0

    Add-TitleBox -Slide $slide -Text $Title -Left 36 -Top 18 -Width 700 -Height 40 -FontSize 24 -Color $brand.ShellNavy | Out-Null
    Add-BrandTag -Slide $slide -Left 810 -Top 18 | Out-Null
    Add-BulletsBox -Slide $slide -Bullets $Bullets -Left 48 -Top 106 -Width 840 -Height 320 -FontSize 22 -Color $brand.Ink | Out-Null
    Add-NoteBox -Slide $slide -Text ("Speaker notes: " + $Note) -Left 48 -Top 462 -Width 820 -Height 54 | Out-Null
    Add-FooterStripe -Slide $slide | Out-Null
    return $slide
}

function New-TableSlide {
    param(
        $Presentation,
        [int]$Index,
        [string]$Title,
        [object[]]$Rows,
        [string]$Note
    )

    $slide = $Presentation.Slides.Add($Index, 12)
    $slide.FollowMasterBackground = 0
    $slide.Background.Fill.ForeColor.RGB = $brand.Canvas

    $banner = $slide.Shapes.AddShape(1, 0, 0, 960, 64)
    $banner.Fill.ForeColor.RGB = $brand.ShellYellow
    $banner.Line.Visible = 0

    $accent = $slide.Shapes.AddShape(1, 0, 64, 960, 8)
    $accent.Fill.ForeColor.RGB = $brand.ShellRed
    $accent.Line.Visible = 0

    Add-TitleBox -Slide $slide -Text $Title -Left 36 -Top 18 -Width 700 -Height 40 -FontSize 24 -Color $brand.ShellNavy | Out-Null
    Add-BrandTag -Slide $slide -Left 810 -Top 18 | Out-Null

    $tableShape = $slide.Shapes.AddTable($Rows.Count + 1, 4, 30, 92, 900, 360)
    $table = $tableShape.Table
    $headers = @('Option', 'Pros', 'Cons', 'Takeaway')

    for ($c = 1; $c -le 4; $c++) {
        $cell = $table.Cell(1, $c).Shape
        $cell.Fill.ForeColor.RGB = $brand.ShellRed
        $cell.TextFrame.TextRange.Text = $headers[$c - 1]
        $cell.TextFrame.TextRange.Font.Name = 'Aptos'
        $cell.TextFrame.TextRange.Font.Size = 13
        $cell.TextFrame.TextRange.Font.Bold = -1
        $cell.TextFrame.TextRange.Font.Color.RGB = $brand.WarmWhite
    }

    $table.Columns.Item(1).Width = 95
    $table.Columns.Item(2).Width = 280
    $table.Columns.Item(3).Width = 255
    $table.Columns.Item(4).Width = 210

    for ($r = 0; $r -lt $Rows.Count; $r++) {
        $row = $Rows[$r]
        $values = @($row.Option, $row.Pros, $row.Cons, $row.Takeaway)
        for ($c = 1; $c -le 4; $c++) {
            $cell = $table.Cell($r + 2, $c).Shape
            $cell.Fill.ForeColor.RGB = if (($r % 2) -eq 0) { $brand.SoftGray } else { $brand.WarmWhite }
            $cell.TextFrame.TextRange.Text = $values[$c - 1]
            $cell.TextFrame.TextRange.Font.Name = 'Aptos'
            $cell.TextFrame.TextRange.Font.Size = 11
            $cell.TextFrame.TextRange.Font.Color.RGB = $brand.Ink
        }
    }

    Add-NoteBox -Slide $slide -Text ("Speaker notes: " + $Note) -Left 48 -Top 470 -Width 820 -Height 46 | Out-Null
    Add-FooterStripe -Slide $slide | Out-Null
    return $slide
}

$slides = @(
    @{ Type = 'title'; Title = 'Sparta EV Run Strategy'; Subtitle = 'Supporting Sparta demand while minimizing logistics operating cost'; Footer = 'Prepared for: Logistics Delivery Manager' },
    @{ Type = 'content'; Title = 'Decision to Make'; Bullets = @('Select the most practical EV run strategy to support Sparta demand.', 'Minimize logistics operating cost while preserving execution reliability.', 'Prefer an existing-fleet solution over adding a dedicated OSV.'); Note = 'This decision is about finding the best operating model for Sparta without structurally increasing cost unless reliability demands it.' },
    @{ Type = 'content'; Title = 'Business Context'; Bullets = @('Sparta introduces new diesel and logistics demand into the EV run system.', 'FSV all-in run cost is about $25k/day.', 'OSV all-in run cost is about $80k/day.', 'Objective: absorb demand with the current fleet wherever feasible.'); Note = 'The cost gap between FSV and OSV is the key economic driver. Any solution that adds a permanent OSV must provide a clear reliability benefit to justify the spend.' },
    @{ Type = 'content'; Title = 'Options Evaluated'; Bullets = @('Current State: baseline only, does not support Sparta demand.', 'Option 1: 12-month solution with added OSV; Mars EV dates shift.', 'Option 2: no asset moved off current EV schedule.', 'Option 3: best fit for about 8 months; higher weather recovery risk.'); Note = 'The analysis compares cost, fleet saturation, and schedule recoverability. The main question is where to trade off cost versus resilience.' },
    @{ Type = 'content'; Title = 'Executive Recommendation'; Bullets = @('Use Option 3 as the base strategy during stable operating months.', 'Keep Option 1 as the contingency for fronts season or repeat recovery failures.', 'Do not pursue Option 2.'); Note = 'Option 3 is the lowest-cost workable plan. Option 1 remains the lowest-risk backup if weather or recovery performance degrades.' },
    @{ Type = 'table'; Title = 'Option Comparison'; Note = 'This is the core decision slide. If leadership wants the lowest cost, Option 3 is the answer. If leadership wants the most conservative 12-month operating plan, Option 1 is the answer.'; Rows = @(
        @{ Option = 'Current State'; Pros = 'Established operating rhythm. Existing vessel pattern is familiar.'; Cons = 'Does not support Sparta demand.'; Takeaway = 'Baseline only.' },
        @{ Option = 'Option 1'; Pros = 'Most stable operating model. Dedicated OSV for Sparta. Only Mars requires EV date change. Better recovery after delays.'; Cons = 'Highest cost due to added OSV. Does not meet the goal of using the existing fleet.'; Takeaway = 'Best reliability, weakest cost efficiency.' },
        @{ Option = 'Option 2'; Pros = 'Keeps current EV dates unchanged.'; Cons = 'Overcommits FSV capacity. Too many vessels committed at once. Limited recovery flexibility.'; Takeaway = 'Not recommended.' },
        @{ Option = 'Option 3'; Pros = 'Best cost and operability balance for most of the year. Avoids full-time added OSV. Keeps fleet count closer to current state.'; Cons = 'Tighter recovery margin. Higher exposure to fronts and weather disruption.'; Takeaway = 'Best base strategy if paired with clear contingency triggers.' }
    ) },
    @{ Type = 'content'; Title = 'Why Option 1 Works'; Bullets = @('Cleanest operational setup.', 'Sparta demand is separated onto a dedicated OSV.', 'Lower schedule congestion and easier recovery after disruption.', 'Only Mars requires an EV date adjustment.'); Note = 'Option 1 reduces operational complexity by absorbing Sparta with dedicated capacity. The tradeoff is straightforward: reliability improves, but cost increases materially.' },
    @{ Type = 'content'; Title = 'Why Option 2 Falls Out'; Bullets = @('Keeps all current EV dates unchanged.', 'Pulls too many FSVs out of the system at the same time.', 'Leaves too little flexibility to recover after delays.', 'Creates the highest fleet saturation of the options reviewed.'); Note = 'Option 2 protects schedule dates, but it does so by consuming too much fleet flexibility. That makes it operationally fragile and not suitable for execution.' },
    @{ Type = 'content'; Title = 'Why Option 3 Is Preferred'; Bullets = @('Lowest-cost workable strategy.', 'Maintains a 5-vessel pattern instead of expanding to 6 vessels.', 'Supports Sparta without committing to a full-time added OSV.', 'Best fit during normal weather months.'); Note = 'Option 3 is preferred because it preserves cost discipline while still making the schedule work. Its weakness is not day-to-day execution in stable conditions, but recovery when fronts begin to disrupt the cycle.' },
    @{ Type = 'content'; Title = 'Key Risk in Option 3'; Bullets = @('Recovery windows become tighter once fronts begin.', 'Existing vessels absorb more of the workload.', 'A missed run can cascade more easily into the next cycle.', 'Sparta, Auger, and ESA rotation becomes more sensitive to disruption.'); Note = 'The right way to present Option 3 is not as a perfect year-round solution. It is the best base plan, but it needs a defined escalation path once weather risk rises.' },
    @{ Type = 'content'; Title = 'Proposed Trigger Points'; Bullets = @('One missed Sparta fuel or diesel delivery window.', 'Two consecutive weather-driven EV schedule slips.', 'Failure to recover Glenn or the swing FSV back to planned port timing within one cycle.', 'Repeated weather disruption affecting Sparta, Auger, or ESA rotation.'); Note = 'These triggers give management a clear operational threshold for when the cost of supplemental OSV support becomes justified.' },
    @{ Type = 'content'; Title = 'Recommended Decision Statement'; Bullets = @('Approve Option 3 as the primary Sparta support strategy during stable months.', 'Pre-align on supplemental OSV support during fronts season or if trigger conditions are met.', 'Reject Option 2 as a non-viable operating plan.'); Note = 'This closes the discussion with a practical recommendation: preserve cost discipline by default, but do not wait too long to escalate if reliability begins to slip.' },
    @{ Type = 'content'; Title = 'Closing Message'; Bullets = @('Option 3 is the best base strategy.', 'Option 1 is the best contingency strategy.', 'The decision should be made now with trigger-based escalation agreed in advance.'); Note = 'This is the balanced message for leadership: lowest-cost execution with a clear backup plan, rather than choosing between cost and reliability as if they are mutually exclusive.' }
)

$powerPoint = $null
$presentation = $null

try {
    $powerPoint = New-Object -ComObject PowerPoint.Application
    $powerPoint.Visible = -1
    $presentation = $powerPoint.Presentations.Add()
    $presentation.PageSetup.SlideSize = 15

    $index = 1
    foreach ($slideDef in $slides) {
        switch ($slideDef.Type) {
            'title' {
                $slide = $presentation.Slides.Add($index, 12)
                $slide.FollowMasterBackground = 0
                $slide.Background.Fill.ForeColor.RGB = $brand.Canvas

                $topBand = $slide.Shapes.AddShape(1, 0, 0, 960, 86)
                $topBand.Fill.ForeColor.RGB = $brand.ShellRed
                $topBand.Line.Visible = 0

                $yellowBand = $slide.Shapes.AddShape(1, 0, 86, 960, 18)
                $yellowBand.Fill.ForeColor.RGB = $brand.ShellYellow
                $yellowBand.Line.Visible = 0

                $accent = $slide.Shapes.AddShape(1, 56, 146, 14, 220)
                $accent.Fill.ForeColor.RGB = $brand.ShellYellow
                $accent.Line.Visible = 0

                Add-BrandTag -Slide $slide -Left 790 -Top 30 -Width 120 -Height 30 | Out-Null
                Add-TitleBox -Slide $slide -Text $slideDef.Title -Left 88 -Top 144 -Width 760 -Height 60 -FontSize 30 -Color $brand.ShellNavy | Out-Null
                Add-TitleBox -Slide $slide -Text $slideDef.Subtitle -Left 88 -Top 214 -Width 760 -Height 60 -FontSize 20 -FontName 'Aptos' -Color $brand.Ink -Bold 0 | Out-Null
                Add-TitleBox -Slide $slide -Text $slideDef.Footer -Left 88 -Top 416 -Width 420 -Height 30 -FontSize 16 -FontName 'Aptos' -Color $brand.ShellRed -Bold 0 | Out-Null
                Add-FooterStripe -Slide $slide | Out-Null
            }
            'content' {
                New-ContentSlide -Presentation $presentation -Index $index -Title $slideDef.Title -Bullets $slideDef.Bullets -Note $slideDef.Note | Out-Null
            }
            'table' {
                New-TableSlide -Presentation $presentation -Index $index -Title $slideDef.Title -Rows $slideDef.Rows -Note $slideDef.Note | Out-Null
            }
        }
        $index++
    }

    if (Test-Path $outputPath) {
        Remove-Item $outputPath -Force
    }

    $presentation.SaveAs($outputPath)
    $presentation.Close()
    $powerPoint.Quit()
}
finally {
    if ($presentation) {
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($presentation) | Out-Null
    }
    if ($powerPoint) {
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

Write-Output "Created $outputPath"