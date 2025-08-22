<# 
Once the hardcoded values are correctly replaced, the script will be able to connect to the Remdy API and create an incident ticket based off the hardcoded values. 
This script specifically is meant to create multiple tickets at a time, up until 50, based of values inputted from a csv file. 
A little bit of code modification is necessary, based on the data in the csv, to appropriately pull in the values and add them to the description/notes of the ticket.
#>
$TICKETLIMIT = 50

$endpoint = "Paste URL endpoint here"


$username = "username"
$password = "password"

$action = "Create Ticket"
 
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$username`:$password"))

$headers = @{
   "Authorization" ="Basic $auth"
   "SOAPAction" = "$action"
   "Content-Type" = "text/xml; charset=utf-8"
}

# put in import/export path 
$importPath = "import csv here"
$exportPath = "export csv pathway"

$apps = Import-Csv -Path $importPath



#ticket = summary 
$ticket = "summary"
$group = ""
$team = "Remedy"
$categorization = "Inquire"

$incidentNumber = @()

$currTicketCount = 0

foreach($app in $apps){


# NOTE: manually change the notes section of the body 

   $notes = "description of the ticket and it's goals go here"
   
   $soapBody = @"
   <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:CreateTicket">
   <soapenv:Header>
   <urn:AuthenticationInfo>
   <urn:userName>$username</urn:userName>
   <urn:password>$password</urn:password>
   </urn:AuthenticationInfo>
   </soapenv:Header>
   <soapenv:Body>
   <urn:$action>
   <urn:Action>CREATE</urn:Action>
   <urn:Summary>$ticket</urn:Summary>
   <urn:First_Name>User</urn:First_Name>
   <urn:Last_Name>Name</urn:Last_Name>
   <urn:Middle_Initial></urn:Middle_Initial>
   <urn:Login_ID>username</urn:Login_ID>
   <urn:Contact_Company>Corporation Incorporated</urn:Contact_Company>
   <urn:Impact>4-Minor/Localized</urn:Impact>
   <urn:Reported_Source>Web</urn:Reported_Source>
   <urn:Service_Type>User Service Request</urn:Service_Type>
   <urn:Status>New</urn:Status>
   <urn:Urgency>4-Low</urn:Urgency>
   <urn:Reported_Source>Other</urn:Reported_Source>
   <urn:Notes>$notes</urn:Notes>
   <urn:Categorization_Tier_1>$categorization</urn:Categorization_Tier_1>
   <urn:Assigned_Group>$team</urn:Assigned_Group>
   <urn:Assigned_Support_Company>Corporation Incorporated</urn:Assigned_Support_Company>
   <urn:Assigned_Support_Organization>$group</urn:Assigned_Support_Organization>
   </urn:$action>
   </soapenv:Body>
   </soapenv:Envelope>
"@

   

   try{
      $headerArgs = @()
      foreach ($h in $headers.GetEnumerator()) {
         $headerArgs += @("-H", "$($h.Key): $($h.Value)")
      }

      $bodyArg = @("-d", "$soapBody")
      $endpointArg = "$endpoint"

      # Combine all arguments
      $curlArgs = @("-X", "POST") + $headerArgs + $bodyArg + $endpointArg

      # Call curl.exe with argument array
      $response = & curl.exe @curlArgs

      [xml]$xml = $response 
      # Use namespace manager to handle the prefixed elements
   $nsMgr = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
   $nsMgr.AddNamespace("soapenv", "http://schemas.xmlsoap.org/soap/envelope/")
   $nsMgr.AddNamespace("ns0", "urn:CreateTicket")

   # Select the Incident_Number node using XPath
   $incidentNode = $xml.SelectSingleNode("//ns0:Incident_Number", $nsMgr)

   # Output the incident number
   if ($incidentNode -ne $null) {
      $incidentNumber += $incidentNode.InnerText
      # Write-Output "Incident Number: $($incidentNode.InnerText)"
      $currTicketCount++
   } else {
      Write-Output "Incident number not found."
   }

      Write-Host "Endpoint is reachable. Submitted a ticket"
      write-host $response

   }catch{
      Write-Host "Connection or authentication failed"
      Write-Host "Status code: $($response.StatusCode)"
      Write-Host $_.Exception.InnerException
      Write-Host $_.Exception.Message
   }

   if($currTicketCount % 10 -eq 0){
      Write-Host "10 tickets have been taking a 5 second break"
      Start-Sleep -Seconds 5 
   }elseif($currTicketCount -eq $TICKETLIMIT){
      Write-Host "Ticket limit has been reached. Please wait before running the script again and submitting more tickets."
      exit
   }



}


Write-Host "Incident Numbers are:"
if($incidentNumber.Length -gt 0){
   for($i = 0; $i -lt $incidentNumber.Length; $i++){
      Write-Host "Incident Number: $($incidentNumber[$i])"
   }   
   
}

try{

   $incidentNumber | Export-Csv -path $exportPath -NoTypeInformation -Encoding UTF8
   Write-Host "Export completed, csv saved to $exportPath "
}catch{
   Write-Host "Export was not successful"

}
